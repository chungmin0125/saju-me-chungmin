import { supabase } from '../lib/supabase'

const PROFILE_COLUMNS =
  'id, name, birth_year, birth_month, birth_day, birth_date, birth_time, gender, calendar_type'

export async function saveProfileRow(payload) {
  const { data, error } = await supabase
    .from('users')
    .upsert(payload, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .single()

  if (error || !data) {
    console.error(error)
    throw new Error('프로필 저장에 실패했습니다.')
  }

  return data
}

export async function fetchProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.error(error)
    throw new Error('프로필을 불러오지 못했습니다.')
  }

  return data
}
