declare module 'ffmpeg-static' {
  // The package's default export is the absolute path to the ffmpeg binary
  // (or null if unavailable for the platform).
  const ffmpegPath: string | null
  export default ffmpegPath
}
