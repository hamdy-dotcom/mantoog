import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static ships a native binary that Next's tracer can't detect from the
  // string-path import, so include it explicitly for the voiceover route and keep
  // it external (never bundled by the compiler).
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/admin/seedance-voiceover": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/admin/proxy-images": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/admin/seedance-diagnose": ["./node_modules/ffmpeg-static/ffmpeg"],
  },
};

export default nextConfig;
