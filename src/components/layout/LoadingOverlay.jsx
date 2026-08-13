import Mascot from '../Mascot'

export default function LoadingOverlay({
  title = '미가 사주를 읽고 있습니다',
  sub = '명식을 세우고 성격을 해석하는 중…',
}) {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-panel">
        <Mascot size="loading" mood="reading" />
        <p className="loading-title">{title}</p>
        <p className="loading-sub">{sub}</p>
        <div className="loading-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </div>
    </div>
  )
}
