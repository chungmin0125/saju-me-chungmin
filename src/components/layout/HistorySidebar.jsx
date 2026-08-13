import { formatReadingWhen } from '../../utils/profile'
import Mascot from '../Mascot'

export default function HistorySidebar({
  user,
  readings,
  selectedReadingId,
  isLoading,
  hasResult,
  onNew,
  onSelect,
  onDelete,
}) {
  return (
    <aside className="history-sidebar" aria-label="저장된 사주 기록">
      <div className="history-header">
        <h2 className="history-title">내 기록</h2>
        <button
          type="button"
          className="new-saju-btn"
          onClick={onNew}
          disabled={isLoading || (!user && !hasResult)}
        >
          새 사주
        </button>
      </div>
      {!user ? (
        <div className="history-empty-wrap">
          <Mascot size="sm" />
          <p className="history-empty">
            로그인 없이 사주를 볼 수 있어요. 기록을 남기려면 Google로 로그인하세요.
          </p>
        </div>
      ) : readings.length === 0 ? (
        <div className="history-empty-wrap">
          <Mascot size="sm" />
          <p className="history-empty">아직 저장된 사주가 없습니다.</p>
        </div>
      ) : (
        <ul className="history-list">
          {readings.map((reading) => (
            <li key={reading.id} className="history-row">
              <button
                type="button"
                className={`history-item${
                  selectedReadingId === reading.id ? ' is-active' : ''
                }`}
                onClick={() => onSelect(reading.id)}
              >
                <span className="history-name">사주 해석</span>
                <span className="history-meta">
                  {formatReadingWhen(reading.created_at)}
                </span>
              </button>
              <button
                type="button"
                className="history-delete-btn"
                aria-label="사주 기록 삭제"
                title="삭제"
                disabled={isLoading || !user}
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(reading.id)
                }}
              >
                삭제
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  )
}
