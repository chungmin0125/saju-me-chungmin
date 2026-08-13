import { createClient } from '@supabase/supabase-js'
import { publicEnv, isSupabaseConfigured } from '../config/publicEnv'

export { isSupabaseConfigured }

if (!isSupabaseConfigured) {
  console.error(
    '[supabase] VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY 가 없습니다. 로컬은 .env, 배포는 Vercel Environment Variables를 확인하세요.'
  )
}

export const supabase = createClient(
  publicEnv.supabaseUrl || 'https://placeholder.supabase.co',
  publicEnv.supabasePublishableKey || 'sb_publishable_placeholder'
)
