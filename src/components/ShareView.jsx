import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import {
  calendarLabelOf,
  formatBirthDateLabel,
} from '../utils/profile'
import { copyToClipboard } from '../utils/share'
import { useSajuTheme } from '../hooks/useSajuTheme'
import Atmosphere from './Atmosphere'
import Mascot from './Mascot'
import SajuResult from './SajuResult'

export default function ShareView({ shareToken }) {
  const [isDark, setIsDark] = useSajuTheme()
  const [reading, setReading] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      if (!shareToken) {
        if (!mounted) return
        setError('유효하지 않은 공유 링크입니다.')
        setLoading(false)
        return
      }

      if (!isSupabaseConfigured) {
        if (!mounted) return
        setError('공유 결과를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      const { data, error: fetchError } = await supabase.rpc(
        'get_shared_reading',
        { share_token: shareToken }
      )

      if (!mounted) return

      if (fetchError) {
        console.error(fetchError)
        setError('사주 결과를 불러오지 못했습니다.')
        setLoading(false)
        return
      }

      const row = Array.isArray(data) ? data[0] : data
      if (!row?.result) {
        setError('이 공유 링크는 없거나 삭제되었습니다.')
        setLoading(false)
        return
      }

      setReading(row)
      setLoading(false)
    }

    load()
    return () => {
      mounted = false
    }
  }, [shareToken])

  const handleShare = async () => {
    try {
      await copyToClipboard(window.location.href)
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      console.error(err)
      setError('링크 복사에 실패했습니다.')
    }
  }

  const calendarLabel = calendarLabelOf(reading?.calendar_type)
  const birthDateLabel = reading?.birth_date
    ? formatBirthDateLabel(reading.birth_date)
    : ''

  return (
    <div className="page is-share">
      <Atmosphere />

      <header className="topbar">
        <a className="brand" href="/">
          <Mascot size="brand" />
          사주미
        </a>
        <div className="topbar-actions">
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {isDark ? '라이트' : '다크'}
          </button>
        </div>
      </header>

      {loading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-panel">
            <Mascot size="loading" mood="reading" />
            <p className="loading-title">사주 결과를 불러오는 중</p>
            <p className="loading-sub">공유된 해석을 펼치는 중…</p>
            <div className="loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      {!loading && error && (
        <div className="login-gate" role="status">
          <Mascot size="sm" />
          <p>{error}</p>
          <a className="auth-btn auth-btn-google" href="/">
            사주미로 돌아가기
          </a>
        </div>
      )}

      {!loading && reading && (
        <>
          <SajuResult
            result={reading.result}
            name={reading.display_name}
            birthDateLabel={birthDateLabel}
            birthTime={reading.birth_time}
            calendarLabel={calendarLabel}
            canShare
            shareCopied={shareCopied}
            onShare={handleShare}
          />
          <p className="share-home-link">
            <a href="/">사주미에서 내 사주 보기</a>
          </p>
        </>
      )}
    </div>
  )
}
