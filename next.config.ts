import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // ffmpeg-static ships a native binary that Next's tracer can't detect from the
  // string-path import, so include it explicitly for the voiceover route and keep
  // it external (never bundled by the compiler).
  serverExternalPackages: ["ffmpeg-static"],
  outputFileTracingIncludes: {
    "/api/admin/seedance-voiceover": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/admin/proxy-images": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/ai/landing-genius": ["./node_modules/ffmpeg-static/ffmpeg", "./src/lib/landing-genius/template.html"],
  },
};

export default nextConfig;
