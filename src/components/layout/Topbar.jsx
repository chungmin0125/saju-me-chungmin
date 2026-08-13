import Mascot from '../Mascot'
import { trackEvent } from '../../lib/analytics'

export default function Topbar({
  isDark,
  onToggleTheme,
  brandHref,
  children,
}) {
  const BrandTag = brandHref ? 'a' : 'p'

  return (
    <header className="topbar">
      <BrandTag className="brand" {...(brandHref ? { href: brandHref } : {})}>
        <Mascot size="brand" />
        사주미
      </BrandTag>
      <div className="topbar-actions">
        {children}
        <button
          type="button"
          className="theme-toggle"
          onClick={() => {
            trackEvent('toggle_theme', { theme: isDark ? 'light' : 'dark' })
            onToggleTheme()
          }}
          aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {isDark ? '라이트' : '다크'}
        </button>
      </div>
    </header>
  )
}

export function AuthActions({
  authReady,
  user,
  userLabel,
  canEditProfile,
  isLoading,
  onEditProfile,
  onLogout,
  onGoogleLogin,
}) {
  if (!authReady) return null

  if (user) {
    return (
      <>
        <span className="user-chip" title={user.email || ''}>
          {userLabel}
        </span>
        {canEditProfile && (
          <button
            type="button"
            className="auth-btn"
            onClick={onEditProfile}
            disabled={isLoading}
          >
            프로필
          </button>
        )}
        <button
          type="button"
          className="auth-btn"
          onClick={onLogout}
          disabled={isLoading}
        >
          로그아웃
        </button>
      </>
    )
  }

  return (
    <button
      type="button"
      className="auth-btn auth-btn-google"
      onClick={onGoogleLogin}
      disabled={isLoading}
    >
      Google 로그인
    </button>
  )
}
