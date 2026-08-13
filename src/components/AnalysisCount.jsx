import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export default function AnalysisCount({ refreshKey = 0 }) {
  const [count, setCount] = useState(null)

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined
    let mounted = true

    supabase
      .from('saju_stats')
      .select('reader_count')
      .eq('id', 1)
      .maybeSingle()
      .then(({ data, error: fetchError }) => {
        if (!mounted || fetchError) return
        const next = Number(data?.reader_count)
        if (Number.isFinite(next)) setCount(next)
      })

    return () => {
      mounted = false
    }
  }, [refreshKey])

  if (count == null) return null

  return (
    <p className="hero-stat">
      지금까지 <strong>{count.toLocaleString('ko-KR')}</strong>명이 사주를
      분석했습니다
    </p>
  )
}
