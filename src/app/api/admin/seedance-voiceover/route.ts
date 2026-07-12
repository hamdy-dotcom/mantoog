import { NextRequest, NextResponse } from 'next/server'
import { assertAdmin } from '@/lib/admin/auth'
import { supabaseAdmin } from '@/lib/tiktok/server'

export const maxDuration = 90

const FAL_MERGE = 'https://queue.fal.run/fal-ai/ffmpeg-api/merge-audio-video'
// Multilingual fallback voice; override with a Najdi voice via ELEVENLABS_VOICE_ID or the request.
const DEFAULT_VOICE = 'EXAVITQu4vr4xnSDxMaL'

async function pollFal(statusUrl: string, responseUrl: string, falKey: string, maxMs: number): Promise<any> {
  const start = Date.now()
  while (Date.now() - start < maxMs) {
    await new Promise(r => setTimeout(r, 2000))
    const st = await fetch(statusUrl, { headers: { 'Authorization': `Key ${falKey}` }, signal: AbortSignal.timeout(10000) })
    const sb = await st.json().catch(() => ({}))
    if (sb?.status === 'COMPLETED') {
      const r = await fetch(responseUrl, { headers: { 'Authorization': `Key ${falKey}` }, signal: AbortSignal.timeout(10000) })
      const rt = await r.text()
      if (!r.ok) throw new Error(`merge result ${r.status}: ${rt.slice(0, 200)}`)
      return JSON.parse(rt)
    }
    if (sb?.status === 'FAILED' || sb?.status === 'ERROR') throw new Error('merge job failed')
  }
  throw new Error('merge timed out')
}

// ElevenLabs TTS (Najdi VO) -> upload -> fal merge onto the Seedance video.
export async function POST(req: NextRequest) {
  const auth = await assertAdmin()
  if (!auth.ok) return auth.response

  const { videoUrl, voiceover, voiceId } = await req.json().catch(() => ({}))
  if (!videoUrl || !voiceover) return NextResponse.json({ error: 'videoUrl and voiceover required' }, { status: 400 })

  const elevenKey = process.env.ELEVENLABS_API_KEY
  if (!elevenKey) return NextResponse.json({ error: 'ELEVENLABS_API_KEY not configured — add it to enable voiceover', needsElevenKey: true }, { status: 400 })
  const falKey = process.env.FAL_KEY
  if (!falKey) return NextResponse.json({ error: 'FAL_KEY not configured' }, { status: 500 })

  const voice = String(voiceId || process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE)

  // 1) ElevenLabs TTS → mp3
  let audioBuffer: Buffer
  try {
    const tts = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}`, {
      method: 'POST',
      headers: { 'xi-api-key': elevenKey, 'Content-Type': 'application/json', 'Accept': 'audio/mpeg' },
      body: JSON.stringify({
        text: voiceover,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.2, use_speaker_boost: true, speed: 1.05 },
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

  // 2) Upload the audio so fal can fetch it
  const path = `ugc-temp/vo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.mp3`
  const up = await supabaseAdmin.storage.from('store-assets').upload(path, audioBuffer, { contentType: 'audio/mpeg', upsert: true })
  if (up.error) return NextResponse.json({ error: `audio upload: ${up.error.message}` }, { status: 502 })
  const audioUrl = supabaseAdmin.storage.from('store-assets').getPublicUrl(path).data.publicUrl

  // 3) Merge VO onto the Seedance video via fal ffmpeg
  try {
    const res = await fetch(FAL_MERGE, {
      method: 'POST',
      headers: { 'Authorization': `Key ${falKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_url: videoUrl, audio_url: audioUrl }),
      signal: AbortSignal.timeout(15000),
    })
    const txt = await res.text()
    if (!res.ok) return NextResponse.json({ error: `merge submit ${res.status}: ${txt.slice(0, 200)}`, audioUrl }, { status: 502 })
    const b = JSON.parse(txt)
    const statusUrl = b.status_url
    const responseUrl = b.response_url
    if (!statusUrl || !responseUrl) return NextResponse.json({ error: 'no merge status url', audioUrl }, { status: 502 })
    const result = await pollFal(statusUrl, responseUrl, falKey, 70000)
    const mergedUrl = result?.video?.url ?? result?.video_url ?? result?.url ?? result?.output?.url ?? ''
    if (!mergedUrl) return NextResponse.json({ error: `merge: no output url. keys: ${Object.keys(result || {}).join(',')}`, audioUrl }, { status: 502 })
    return NextResponse.json({ mergedUrl, audioUrl })
  } catch (e: any) {
    return NextResponse.json({ error: `merge error: ${e.message}`, audioUrl }, { status: 502 })
  }
}
