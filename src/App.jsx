import { useSajuApp } from './hooks/useSajuApp'
import { useSajuTheme } from './hooks/useSajuTheme'
import { trackEvent } from './lib/analytics'
import Atmosphere from './components/layout/Atmosphere'
import Hero from './components/layout/Hero'
import HistorySidebar from './components/layout/HistorySidebar'
import LoadingOverlay from './components/layout/LoadingOverlay'
import Topbar, { AuthActions } from './components/layout/Topbar'
import ProfileModal from './components/profile/ProfileModal'
import GuestForm from './components/saju/GuestForm'
import GuestPaywall from './components/saju/GuestPaywall'
import ProfileCard from './components/saju/ProfileCard'
import SajuResult from './components/saju/SajuResult'
import ViewingBadge from './components/saju/ViewingBadge'

export default function App() {
  const [isDark, setIsDark] = useSajuTheme()
  const {
    result,
    preview,
    isLoading,
    error,
    readings,
    selectedReadingId,
    shareCopied,
    user,
    authReady,
    profile,
    guestDraft,
    setGuestDraft,
    setProfileModal,
    activeInfo,
    calendarLabel,
    birthDateLabel,
    guestReady,
    canAnalyze,
    isGuestPreview,
    lockedBlocks,
    guestMissingHint,
    userLabel,
    suggestedName,
    showOnboarding,
    showEditModal,
    showProfileCard,
    modalInitialProfile,
    canEditProfile,
    handleGoogleLogin,
    handleLogout,
    handleSaveProfile,
    handleSelectReading,
    handleAnalyze,
    handleNewSaju,
    handleShare,
    handleDeleteReading,
  } = useSajuApp()

  return (
    <div className="page">
      <Atmosphere />

      {isLoading && <LoadingOverlay />}

      {(showOnboarding || showEditModal) && (
        <ProfileModal
          mode={showOnboarding ? 'onboarding' : 'edit'}
          userId={user.id}
          initialProfile={modalInitialProfile}
          suggestedName={suggestedName}
          onSave={handleSaveProfile}
          onClose={showOnboarding ? undefined : () => setProfileModal(null)}
        />
      )}

      <HistorySidebar
        user={user}
        readings={readings}
        selectedReadingId={selectedReadingId}
        isLoading={isLoading}
        hasResult={Boolean(result)}
        onNew={handleNewSaju}
        onSelect={handleSelectReading}
        onDelete={handleDeleteReading}
      />

      <Topbar
        isDark={isDark}
        onToggleTheme={() => setIsDark((prev) => !prev)}
      >
        <AuthActions
          authReady={authReady}
          user={user}
          userLabel={userLabel}
          canEditProfile={canEditProfile}
          isLoading={isLoading}
          onEditProfile={() => {
            trackEvent('edit_profile')
            setProfileModal('edit')
          }}
          onLogout={handleLogout}
          onGoogleLogin={() => handleGoogleLogin('topbar')}
        />
      </Topbar>

      <main className="app">
        <Hero refreshKey={readings.length} />

        {!user && (
          <GuestForm
            draft={guestDraft}
            onChange={setGuestDraft}
            missingHint={guestMissingHint}
            isReady={guestReady}
            isLoading={isLoading}
            onAnalyze={handleAnalyze}
          />
        )}

        {showProfileCard && (
          <>
            {selectedReadingId && (
              <ViewingBadge
                isLoading={isLoading}
                canDelete={Boolean(user)}
                onDelete={() => handleDeleteReading(selectedReadingId)}
                onNew={handleNewSaju}
              />
            )}
            <ProfileCard
              profile={profile}
              isLoading={isLoading}
              canAnalyze={canAnalyze}
              selectedReadingId={selectedReadingId}
              onEdit={() => {
                trackEvent('edit_profile')
                setProfileModal('edit')
              }}
              onAnalyze={handleAnalyze}
            />
          </>
        )}

        {error && <p className="error">{error}</p>}
      </main>

      {result && (
        <SajuResult
          result={preview}
          eyebrow={isGuestPreview ? '미리보기 사주 해석' : '사주 해석'}
          name={activeInfo.name}
          birthDateLabel={birthDateLabel}
          birthTime={activeInfo.birthTime}
          calendarLabel={calendarLabel}
          extra={
            isGuestPreview ? (
              <GuestPaywall
                lockedBlocks={lockedBlocks}
                isLoading={isLoading}
                onGoogleLogin={() => handleGoogleLogin('paywall')}
              />
            ) : null
          }
          isOwner={Boolean(user && selectedReadingId)}
          isLoading={isLoading}
          canShare={Boolean(user && selectedReadingId)}
          shareCopied={shareCopied}
          onShare={handleShare}
          onDelete={
            user && selectedReadingId
              ? () => handleDeleteReading(selectedReadingId)
              : undefined
          }
          onNew={handleNewSaju}
        />
      )}
    </div>
  )
}
