import { useEffect, useState } from 'react'
import {
  calendarLabelOf,
  daysInMonth,
  draftToPayload,
  getMissingProfileFields,
  profileToDraft,
} from '../utils/profile'
import Mascot from './Mascot'

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

  const maxDay = daysInMonth(draft.birthYear, draft.birthMonth)

  useEffect(() => {
    if (draft.birthDay && Number(draft.birthDay) > maxDay) {
      setDraft((prev) => ({ ...prev, birthDay: '' }))
    }
  }, [draft.birthDay, maxDay])

  const missingFields = getMissingProfileFields(draft)
  const isReady = missingFields.length === 0
  const missingHint = isReady
    ? ''
    : `${missingFields.join(' · ')}을(를) 입력해 주세요`

  const updateField = (key) => (e) => {
    let value = e.target.value
    if (key === 'birthYear') value = value.replace(/\D/g, '').slice(0, 4)
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

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
          <div className="field">
            <label htmlFor="profile-name">이름</label>
            <input
              id="profile-name"
              type="text"
              value={draft.name}
              onChange={updateField('name')}
              placeholder="이름을 입력하세요"
              disabled={saving}
              autoFocus
            />
          </div>

          <div className="field">
            <span className="field-group-label" id="profile-birth-label">
              생년월일
            </span>
            <div
              className="birth-row"
              role="group"
              aria-labelledby="profile-birth-label"
            >
              <div className="birth-part">
                <label htmlFor="profile-birthYear">연</label>
                <input
                  id="profile-birthYear"
                  type="text"
                  inputMode="numeric"
                  placeholder="1998"
                  value={draft.birthYear}
                  onChange={updateField('birthYear')}
                  disabled={saving}
                />
              </div>
              <div className="birth-part">
                <label htmlFor="profile-birthMonth">월</label>
                <select
                  id="profile-birthMonth"
                  value={draft.birthMonth}
                  onChange={updateField('birthMonth')}
                  disabled={saving}
                >
                  <option value="">월</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="birth-part">
                <label htmlFor="profile-birthDay">일</label>
                <select
                  id="profile-birthDay"
                  value={draft.birthDay}
                  onChange={updateField('birthDay')}
                  disabled={saving}
                >
                  <option value="">일</option>
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="profile-birthTime">태어난 시간</label>
            <input
              id="profile-birthTime"
              type="time"
              value={draft.birthTime}
              onChange={updateField('birthTime')}
              disabled={saving}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="profile-gender">성별</label>
              <select
                id="profile-gender"
                value={draft.gender}
                onChange={updateField('gender')}
                disabled={saving}
              >
                <option value="">선택하세요</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="profile-calendarType">양력 / 음력</label>
              <select
                id="profile-calendarType"
                value={draft.calendarType}
                onChange={updateField('calendarType')}
                disabled={saving}
              >
                <option value="">선택하세요</option>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </div>
          </div>

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
