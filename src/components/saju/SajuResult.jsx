import { useRef, useState } from 'react'
import { trackEvent } from '../../lib/analytics'
import { parseResultBlocks } from '../../utils/formatSajuResult'
import { downloadResultImage } from '../../utils/downloadResultImage'
import ResultBody from './ResultBody'

export default function SajuResult({
  result,
  eyebrow = '사주 해석',
  name,
  birthDateLabel,
  birthTime,
  calendarLabel,
  extra = null,
  isOwner = false,
  isLoading = false,
  canShare = false,
  shareCopied = false,
  onShare,
  onDelete,
  onNew,
}) {
  const captureRef = useRef(null)
  const [downloadState, setDownloadState] = useState('idle')
  const resultBlocks = result ? parseResultBlocks(result) : []

  const handleDownload = async () => {
    if (!captureRef.current || downloadState === 'saving') return
    setDownloadState('saving')
    try {
      await downloadResultImage(captureRef.current, name)
      setDownloadState('done')
      trackEvent('download_image', { content_type: 'saju', status: 'success' })
      window.setTimeout(() => setDownloadState('idle'), 2000)
    } catch (err) {
      console.error(err)
      setDownloadState('error')
      trackEvent('download_image', { content_type: 'saju', status: 'error' })
    }
  }

  const downloadLabel =
    downloadState === 'saving'
      ? '저장 중…'
      : downloadState === 'done'
        ? '저장됨'
        : downloadState === 'error'
          ? '다시 시도'
          : '이미지 저장'

  return (
    <section id="saju-result" className="result" aria-label="사주 해석 결과">
      <div ref={captureRef} className="result-capture">
        <div className="result-header">
          <p className="result-eyebrow">{eyebrow}</p>
          <h2 className="result-title">
            {name ? `${name}님의 기운` : '당신의 기운'}
          </h2>
          <p className="result-meta">
            {birthDateLabel}
            {birthTime ? ` · ${birthTime}` : ''}
            {calendarLabel && calendarLabel !== '(아직 선택 없음)'
              ? ` · ${calendarLabel}`
              : ''}
          </p>
          <div className="result-ornament" aria-hidden="true">
            <span />
            <span className="result-ornament-dot" />
            <span />
          </div>
        </div>

        <ResultBody blocks={resultBlocks} />

        <p className="result-capture-brand">사주미</p>
      </div>

      {extra}

      <div className="result-actions">
        <div className="result-share-row">
          <button
            type="button"
            className="result-share-btn"
            onClick={onShare}
            disabled={isLoading || !canShare}
            title={
              canShare
                ? '결과 페이지 링크 복사'
                : '저장된 사주만 공유할 수 있습니다'
            }
          >
            {shareCopied ? '링크 복사됨' : '공유하기'}
          </button>
          <button
            type="button"
            className="result-download-btn"
            onClick={handleDownload}
            disabled={isLoading || downloadState === 'saving'}
          >
            {downloadLabel}
          </button>
        </div>

        {isOwner && onDelete && (
          <button
            type="button"
            className="result-delete-btn"
            onClick={onDelete}
            disabled={isLoading}
          >
            이 기록 삭제
          </button>
        )}
        {onNew && (
          <button
            type="button"
            className="result-new-btn"
            onClick={onNew}
            disabled={isLoading}
          >
            새 사주 만들기
          </button>
        )}
      </div>
    </section>
  )
}
