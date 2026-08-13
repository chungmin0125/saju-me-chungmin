import Mascot from '../Mascot'
import ResultBody from './ResultBody'

export default function GuestPaywall({ lockedBlocks, isLoading, onGoogleLogin }) {
  return (
    <div className="result-paywall">
      {lockedBlocks.length > 0 && (
        <div className="result-locked" aria-hidden="true">
          <ResultBody blocks={lockedBlocks} />
        </div>
      )}
      <div className="result-paywall-card">
        <Mascot size="sm" />
        <p className="result-paywall-title">나머지 해석이 잠겨 있습니다</p>
        <p className="result-paywall-sub">
          Google로 로그인하면 전체 사주를 보고, 지금 입력한 정보가 프로필에 저장됩니다.
        </p>
        <button
          type="button"
          className="auth-btn auth-btn-google"
          onClick={onGoogleLogin}
          disabled={isLoading}
        >
          Google로 전체 보기
        </button>
      </div>
    </div>
  )
}
