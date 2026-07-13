import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'
import { spawn } from 'child_process'
import { writeFile, readFile, rm, mkdtemp } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import ffmpegPath from 'ffmpeg-static'

export const runtime = 'nodejs'
export const maxDuration = 120

// Multilingual fallback voice; override with a Saudi voice via ELEVENLABS_VOICE_ID or the request.
const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL'
// The voiceover starts ~1.5s into the clip; the original ambient audio is kept but
// ducked to 25% so the voice dominates without deleting the video's own sound.
const VO_DELAY_MS = 1500
const BG_VOLUME = 0.25
// The voiceover must finish inside the 15s clip: starting at 1.5s, cap its spoken
// length so it ends well before the end. If TTS runs longer, we speed it up to fit.
const MAX_VO_SEC = 11.5

function runFfmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!ffmpegPath) return reject(new Error('ffmpeg binary unavailable'))
    const p = spawn(ffmpegPath, args)
    let err = ''
    p.stderr.on('data', d => { err += d.toString() })
    p.on('error', reject)
    p.on('close', code => code === 0 ? resolve() : reject(new Error(err.slice(-600) || `ffmpeg exit ${code}`)))
  })
}

// Read a media file's duration in seconds (ffmpeg prints it to stderr even with no output).
function probeDuration(file: string): Promise<number | null> {
  return new Promise(resolve => {
    if (!ffmpegPath) return resolve(null)
    const p = spawn(ffmpegPath, ['-i', file])
    let err = ''
    p.stderr.on('data', d => { err += d.toString() })
    p.on('error', () => resolve(null))
    p.on('close', () => {
      const m = err.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/)
      resolve(m ? (+m[1] * 3600 + +m[2] * 60 + +m[3]) : null)
    })
  })
}

// ElevenLabs TTS (Saudi VO) -> mix onto the Seedance video with ffmpeg:
// keep the full video length, duck the original audio to 40%, delay the VO ~1.5s.
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { videoUrl, voiceover, voiceId, gender } = await req.json().catch(() => ({}))
  if (!videoUrl || !voiceover) return NextResponse.json({ error: 'videoUrl and voiceover required' }, { status: 400 })

  const elevenKey = process.env.ELEVENLABS_API_KEY
  if (!elevenKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured — add it to enable voiceover', needsElevenKey: true }, { status: 400 })
  if (!ffmpegPath) return NextResponse.json({ error: 'ffmpeg not available on the server' }, { status: 500 })

  // Pick the voice: explicit override → gender-based env voice → single default env → fallback
  const genderVoice = gender === 'female' ? process.env.ELEVENLABS_VOICE_ID_FEMALE : gender === 'male' ? process.env.ELEVENLABS_VOICE_ID_MALE : ''
  const voice = String(voiceId || genderVoice || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE)

  // 1) ElevenLabs TTS → mp3
  let audioBuffer: Buffer
  try {
    const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({
        text: voiceover,
        model_id: 'eleven_multilingual_v2',
        // Tuned for a natural, real human delivery: higher stability + fidelity, low
        // "style" exaggeration, speaker boost on, natural (1.0) pace.
        voice_settings: { stability: 0.6, similarity_boost: 0.95, style: 0.15, use_speaker_boost: true, speed: 1.0 },
      }),
      signal: AbortSignal.timeout(30000),
    })
    if (!tts.ok) {
      const t = await tts.text()
      return NextResponse.json({ error: `ElevenLabs ${tts.status}: ${t.slice(0, 200)}` }, { status: 502 })
    }
    audioBuffer = Buffer.from(await tts.arrayBuffer())
  } catch (e: any) {
    return NextResponse.json({ error: `ElevenLabs error: ${e.message}` }, { status: 502 })
  }

  // 2) Download the Seedance video
  let videoBuffer: Buffer
  try {
    const v = await fetch(videoUrl, { signal: AbortSignal.timeout(45000) })
    if (!v.ok) return NextResponse.json({ error: `Could not fetch video (${v.status})` }, { status: 502 })
    videoBuffer = Buffer.from(await v.arrayBuffer())
  } catch (e: any) {
    return NextResponse.json({ error: `video download error: ${e.message}` }, { status: 502 })
  }

  // 3) ffmpeg mix in a temp dir
  const dir = await mkdtemp(join(tmpdir(), 'vo-'))
  const inVideo = join(dir, 'in.mp4')
  const inVo = join(dir, 'vo.mp3')
  const outFile = join(dir, 'out.mp4')
  try {
    await writeFile(inVideo, videoBuffer)
    await writeFile(inVo, audioBuffer)

    // If the VO is longer than the window, speed it up (atempo) so it finishes inside the clip.
    const voDur = await probeDuration(inVo)
    const tempo = voDur && voDur > MAX_VO_SEC ? Math.min(voDur / MAX_VO_SEC, 1.5) : 1
    const voChain = tempo > 1.001
      ? `atempo=${tempo.toFixed(3)},adelay=delays=${VO_DELAY_MS}:all=1`
      : `adelay=delays=${VO_DELAY_MS}:all=1`

    // Primary: original audio ducked to 30% + VO (fitted + delayed), mixed, video copied (full length kept).
    const mixArgs = (filter: string) => [
      '-y', '-i', inVideo, '-i', inVo,
      '-filter_complex', filter,
      '-map', '0:v', '-map', '[a]',
      '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart',
      outFile,
    ]
    const primary = `[0:a]volume=${BG_VOLUME}[bg];[1:a]${voChain}[vo];[bg][vo]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`
    try {
      await runFfmpeg(mixArgs(primary))
    } catch {
      // Fallback: the source clip had no audio track — just fit + delay the VO over the (silent) video.
      const fallback = `[1:a]${voChain}[a]`
      await runFfmpeg(mixArgs(fallback))
    }

    const merged = await readFile(outFile)

    // 4) Upload the merged video
    const path = `ugc-temp/merged-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp4`
    const up = await supabaseAdmin.storage.from('store-assets').upload(path, merged, { contentType: 'video/mp4', upsert: true })
    if (up.error) return NextResponse.json({ error: `merged upload: ${up.error.message}` }, { status: 502 })
    const mergedUrl = supabaseAdmin.storage.from('store-assets').getPublicUrl(path).data.publicUrl
    return NextResponse.json({ mergedUrl })
  } catch (e: any) {
    return NextResponse.json({ error: `mix error: ${e.message}` }, { status: 502 })
  } finally {
    rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
