import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // .env 파일 + Netlify/Vercel 빌드 환경변수까지 읽습니다.
  const fileEnv = loadEnv(mode, process.cwd(), '')
  const geminiKey =
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    fileEnv.VITE_GEMINI_API_KEY ||
    fileEnv.GEMINI_API_KEY ||
    ''

  if (mode === 'production' && !geminiKey) {
    console.warn(
      '[vite] VITE_GEMINI_API_KEY / GEMINI_API_KEY 가 없습니다. 배포 환경 변수를 확인하세요.'
    )
  }

  return {
    plugins: [react()],
    // 어떤 이름으로 넣어도 프론트에서 VITE_GEMINI_API_KEY 로 읽히게 고정
    define: {
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(geminiKey),
    },
    // 로컬: 브라우저 → Vite 프록시 → Google API (CORS 우회)
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
