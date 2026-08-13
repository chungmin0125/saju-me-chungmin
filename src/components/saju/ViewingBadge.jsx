export default function ViewingBadge({ isLoading, canDelete, onDelete, onNew }) {
  return (
    <div className="viewing-badge" role="status">
      <span>저장된 기록 보는 중</span>
      <div className="viewing-badge-actions">
        <button
          type="button"
          className="viewing-badge-action is-danger"
          onClick={onDelete}
          disabled={isLoading || !canDelete}
        >
          삭제
        </button>
        <button
          type="button"
          className="viewing-badge-action"
          onClick={onNew}
          disabled={isLoading || !canDelete}
        >
          새 사주
        </button>
      </div>
    </div>
  )
}
