/** Capture first frame of a video file as JPEG data URL (best-effort). */
export async function captureVideoThumbnail(file: File): Promise<string | null> {
  if (!file.type.startsWith('video/')) return null
  return new Promise(resolve => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    const url = URL.createObjectURL(file)
    video.src = url

    const cleanup = () => {
      URL.revokeObjectURL(url)
      video.remove()
    }

    video.onloadeddata = () => {
      video.currentTime = Math.min(0.5, video.duration / 2 || 0)
    }

    video.onseeked = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth || 320
        canvas.height = video.videoHeight || 568
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          cleanup()
          resolve(null)
          return
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        cleanup()
        resolve(dataUrl)
      } catch {
        cleanup()
        resolve(null)
      }
    }

    video.onerror = () => {
      cleanup()
      resolve(null)
    }
  })
}

export async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return new File([blob], filename, { type: blob.type || 'image/jpeg' })
}
