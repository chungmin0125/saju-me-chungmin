import { useEffect, useState } from 'react'
import { trackEvent } from '../../lib/analytics'
import { fetchSharedReading } from '../../api/readings'
import { isSupabaseConfigured } from '../../lib/supabase'
import {
  calendarLabelOf,
  formatBirthDateLabel,
} from '../../utils/profile'
import { copyToClipboard } from '../../utils/share'
import { useSajuTheme } from '../../hooks/useSajuTheme'
import Atmosphere from '../layout/Atmosphere'
import LoadingOverlay from '../layout/LoadingOverlay'
import Topbar from '../layout/Topbar'
import Mascot from '../Mascot'
import SajuResult from '../saju/SajuResult'

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
        trackEvent('view_share', { status: 'invalid' })
        return
      }

      if (!isSupabaseConfigured) {
        if (!mounted) return
        setError('공유 결과를 불러올 수 없습니다.')
        setLoading(false)
        return
      }

      try {
        const row = await fetchSharedReading(shareToken)
        if (!mounted) return

        if (!row?.result) {
          setError('이 공유 링크는 없거나 삭제되었습니다.')
          setLoading(false)
          trackEvent('view_share', { status: 'not_found' })
          return
        }

        setReading(row)
        setLoading(false)
        trackEvent('view_share', { status: 'success' })
      } catch (err) {
        if (!mounted) return
        console.error(err)
        setError('사주 결과를 불러오지 못했습니다.')
        setLoading(false)
        trackEvent('view_share', { status: 'error' })
      }
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
      trackEvent('share', {
        method: 'link',
        content_type: 'saju',
        status: 'success',
        source: 'share_page',
      })
    } catch (err) {
      console.error(err)
      setError('링크 복사에 실패했습니다.')
      trackEvent('share', {
        method: 'link',
        content_type: 'saju',
        status: 'error',
        source: 'share_page',
      })
    }
  }

  const calendarLabel = calendarLabelOf(reading?.calendar_type)
  const birthDateLabel = reading?.birth_date
    ? formatBirthDateLabel(reading.birth_date)
    : ''

  return (
    <div className="page is-share">
      <Atmosphere />

      <Topbar
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
        brandHref="/"
      />

      {loading && (
        <LoadingOverlay
          title="사주 결과를 불러오는 중"
          sub="공유된 해석을 펼치는 중…"
        />
      )}

      {!loading && error && (
        <div className="login-gate" role="status">
          <Mascot size="sm" />
          <p>{error}</p>
          <a
            className="auth-btn auth-btn-google"
            href="/"
            onClick={() => trackEvent('click_home', { source: 'share_error' })}
          >
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
            <a
              href="/"
              onClick={() => trackEvent('click_home', { source: 'share_page' })}
            >
              사주미에서 내 사주 보기
            </a>
          </p>
        </>
      )}
    </div>
  )
}
