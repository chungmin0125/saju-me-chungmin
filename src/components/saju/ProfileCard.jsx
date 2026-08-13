import {
  calendarLabelOf,
  formatBirthDateLabel,
  genderLabelOf,
} from '../../utils/profile'

export default function ProfileCard({ profile, isLoading, canAnalyze, selectedReadingId, onEdit, onAnalyze }) {
  return (
    <section className="profile-card" aria-label="내 사주 정보">
      <div className="profile-card-header">
        <div>
          <p className="profile-card-eyebrow">내 사주 정보</p>
          <h2 className="profile-card-name">{profile.name}</h2>
        </div>
        <button
          type="button"
          className="profile-edit-btn"
          onClick={onEdit}
          disabled={isLoading}
        >
          수정
        </button>
      </div>
      <dl className="profile-card-meta">
        <div>
          <dt>생년월일</dt>
          <dd>
            {formatBirthDateLabel(profile.birth_date)}
            {calendarLabelOf(profile.calendar_type)
              ? ` · ${calendarLabelOf(profile.calendar_type)}`
              : ''}
          </dd>
        </div>
        <div>
          <dt>태어난 시간</dt>
          <dd>{profile.birth_time}</dd>
        </div>
        <div>
          <dt>성별</dt>
          <dd>{genderLabelOf(profile.gender)}</dd>
        </div>
      </dl>
      <button
        type="button"
        className="analyze-btn"
        onClick={onAnalyze}
        disabled={isLoading || !canAnalyze}
      >
        {selectedReadingId ? '다시 분석하기' : '사주 보기'}
      </button>
    </section>
  )
}
