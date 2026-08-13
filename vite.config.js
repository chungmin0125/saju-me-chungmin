import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')

  // Netlify 등에서 GEMINI_API_KEY 만 넣은 경우도 VITE_ 로 읽히게 맞춤
  // (import.meta.env.X 를 define으로 덮지 않음 — 다른 VITE_* 가 깨질 수 있음)
  const geminiKey =
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    fileEnv.VITE_GEMINI_API_KEY ||
    fileEnv.GEMINI_API_KEY ||
    ''

  if (geminiKey) {
    process.env.VITE_GEMINI_API_KEY = geminiKey
  }

  if (mode === 'production' && !geminiKey) {
    console.warn(
      '[vite] VITE_GEMINI_API_KEY / GEMINI_API_KEY 가 없습니다. 배포 환경 변수를 확인하세요.'
    )
  }

  if (
    mode === 'production' &&
    !(
      process.env.VITE_SUPABASE_URL ||
      fileEnv.VITE_SUPABASE_URL
    )
  ) {
    console.warn(
      '[vite] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 가 없습니다. 배포 환경 변수를 확인하세요.'
    )
  }

  return {
    plugins: [react()],
    envDir: process.cwd(),
    server: {
      proxy: {
        '/api/gemini': {
          target: 'https://generativelanguage.googleapis.com',
          changeOrigin: true,
          secure: true,
          rewrite: (path) => path.replace(/^\/api\/gemini/, ''),
        },
      },
    },
  }
})
