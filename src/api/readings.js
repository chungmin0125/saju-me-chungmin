import { supabase } from '../lib/supabase'

export async function saveReadingForUser(
  currentUser,
  answer,
  editingId = null,
  snapshot = {}
) {
  if (editingId) {
    const { data: updated, error: updateError } = await supabase
      .from('saju_readings')
      .update({ result: answer, ...snapshot })
      .eq('id', editingId)
      .eq('user_id', currentUser.id)
      .select('id, share_token')
      .single()

    if (updateError) {
      console.error(updateError)
      return {
        id: editingId,
        share_token: null,
        error: '사주 결과는 나왔지만 수정 저장에 실패했습니다.',
      }
    }

    return {
      id: editingId,
      share_token: updated?.share_token ?? null,
    }
  }

  const { data: saved, error: saveError } = await supabase
    .from('saju_readings')
    .insert({
      user_id: currentUser.id,
      result: answer,
      ...snapshot,
    })
    .select('id, share_token')
    .single()

  if (saveError) {
    console.error(saveError)
    return {
      id: null,
      share_token: null,
      error: '사주 결과는 나왔지만 저장에 실패했습니다.',
    }
  }

  return {
    id: saved?.id ?? null,
    share_token: saved?.share_token ?? null,
  }
}

export async function fetchReadings(userId) {
  const { data, error } = await supabase
    .from('saju_readings')
    .select('id, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error(error)
    return []
  }

  return data ?? []
}

export async function fetchReading(readingId) {
  const { data, error } = await supabase
    .from('saju_readings')
    .select('id, result, share_token')
    .eq('id', readingId)
    .single()

  if (error || !data) {
    console.error(error)
    throw new Error('저장된 사주를 불러오지 못했습니다.')
  }

  return data
}

export async function deleteReading(userId, readingId) {
  const { error } = await supabase
    .from('saju_readings')
    .delete()
    .eq('id', readingId)
    .eq('user_id', userId)

  if (error) {
    console.error(error)
    throw new Error('기록 삭제에 실패했습니다.')
  }
}

export async function publishReadingShare(userId, readingId, snapshot) {
  const { data, error } = await supabase
    .from('saju_readings')
    .update(snapshot)
    .eq('id', readingId)
    .eq('user_id', userId)
    .select('share_token')
    .single()

  if (error || !data?.share_token) {
    console.error(error)
    throw new Error('공유 링크를 만들지 못했습니다.')
  }

  return data.share_token
}

export async function fetchSharedReading(shareToken) {
  const { data, error } = await supabase.rpc('get_shared_reading', {
    share_token: shareToken,
  })

  if (error) {
    console.error(error)
    throw new Error('사주 결과를 불러오지 못했습니다.')
  }

  return Array.isArray(data) ? data[0] : data
}
