import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const fileEnv = loadEnv(mode, process.cwd(), '')

  const geminiApiKey =
    process.env.VITE_GEMINI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    fileEnv.VITE_GEMINI_API_KEY ||
    fileEnv.GEMINI_API_KEY ||
    ''

  const supabaseUrl =
    process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL || ''
  const supabasePublishableKey =
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    fileEnv.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''

  if (mode === 'production') {
    if (!geminiApiKey) {
      console.warn(
        '[vite] VITE_GEMINI_API_KEY / GEMINI_API_KEY 가 없습니다. Vercel/Netlify 환경 변수를 확인하세요.'
      )
    }
    if (!supabaseUrl || !supabasePublishableKey) {
      console.warn(
        '[vite] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 가 없습니다. Vercel/Netlify 환경 변수를 확인하세요.'
      )
    }
  } else {
    console.info('[vite] env check', {
      supabaseUrl: Boolean(supabaseUrl),
      supabasePublishableKey: Boolean(supabasePublishableKey),
      geminiApiKey: Boolean(geminiApiKey),
    })
  }

  // import.meta.env.* 개별 define은 다른 VITE_* 를 깨뜨릴 수 있어
  // 공개 설정을 하나의 객체로만 주입합니다.
  const publicEnv = {
    supabaseUrl,
    supabasePublishableKey,
    geminiApiKey,
  }

  return {
    plugins: [react()],
    envDir: process.cwd(),
    define: {
      __PUBLIC_ENV__: JSON.stringify(publicEnv),
    },
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
