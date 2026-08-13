import { useEffect, useState } from 'react'
import {
  calendarLabelOf,
  draftToPayload,
  getMissingProfileFields,
  profileToDraft,
} from '../utils/profile'
import Mascot from './Mascot'
import SajuFields from './SajuFields'

export default function ProfileModal({
  mode,
  userId,
  initialProfile,
  suggestedName = '',
  onSave,
  onClose,
}) {
  const isOnboarding = mode === 'onboarding'
  const [draft, setDraft] = useState(() => {
    const next = profileToDraft(initialProfile)
    if (!next.name && suggestedName) next.name = suggestedName
    return next
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const next = profileToDraft(initialProfile)
    if (!next.name && suggestedName) next.name = suggestedName
    setDraft(next)
    setError('')
  }, [initialProfile, suggestedName, mode])

  const missingFields = getMissingProfileFields(draft)
  const isReady = missingFields.length === 0
  const missingHint = isReady
    ? ''
    : `${missingFields.join(' · ')}을(를) 입력해 주세요`

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isReady || saving) return

    setSaving(true)
    setError('')
    try {
      await onSave(draftToPayload(userId, draft))
    } catch (err) {
      setError(err.message || '프로필 저장에 실패했습니다.')
      setSaving(false)
    }
  }

  const handleOverlayClick = () => {
    if (!isOnboarding && !saving && onClose) onClose()
  }

  return (
    <div
      className="modal-overlay"
      role="presentation"
      onClick={handleOverlayClick}
    >
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <Mascot size="md" />
        <p className="modal-eyebrow">{isOnboarding ? '처음 오신 분' : '내 정보'}</p>
        <h2 id="profile-modal-title" className="modal-title">
          {isOnboarding ? '사주 정보를 입력해 주세요' : '프로필 수정'}
        </h2>
        <p className="modal-sub">
          {isOnboarding
            ? '한 번만 입력하면 다음부터는 바로 사주를 볼 수 있습니다.'
            : '생년월일과 태어난 시간을 바꾸면 이후 사주 분석에 반영됩니다.'}
        </p>

        <form className="modal-form" onSubmit={handleSubmit}>
          <SajuFields
            idPrefix="profile"
            draft={draft}
            onChange={setDraft}
            disabled={saving}
            autoFocus
          />

          {!isReady && <p className="form-hint">{missingHint}</p>}
          {error && <p className="error">{error}</p>}

          <div className="modal-actions">
            <button
              type="submit"
              className="analyze-btn"
              disabled={!isReady || saving}
            >
              {saving ? '저장 중…' : isOnboarding ? '저장하고 시작하기' : '프로필 저장'}
            </button>
            {!isOnboarding && (
              <button
                type="button"
                className="clear-btn"
                onClick={onClose}
                disabled={saving}
              >
                닫기
              </button>
            )}
          </div>
        </form>

        {draft.calendarType && (
          <p className="modal-footnote">
            {calendarLabelOf(draft.calendarType)} 기준으로 저장됩니다.
          </p>
        )}
      </div>
    </div>
  )
}
