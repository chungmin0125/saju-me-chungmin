import { useEffect, useState } from 'react'
import './App.css'
import { buildSajuPrompt } from './prompts/buildSajuPrompt'
import { askGemini } from './api/gemini'
import { parseResultBlocks, renderRichText } from './utils/formatSajuResult'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import ProfileModal from './components/ProfileModal'
import Mascot from './components/Mascot'
import Atmosphere from './components/Atmosphere'
import SajuResult from './components/SajuResult'
import SajuFields from './components/SajuFields'
import AnalysisCount from './components/AnalysisCount'
import {
  buildShareUrl,
  copyToClipboard,
  readingSnapshotFromProfile,
} from './utils/share'
import {
  calendarLabelOf,
  clearGuestDraft,
  clearGuestResult,
  draftToPayload,
  formatBirthDateLabel,
  formatReadingWhen,
  genderLabelOf,
  getMissingProfileFields,
  isDraftComplete,
  isProfileComplete,
  loadGuestDraft,
  loadGuestResult,
  saveGuestDraft,
  saveGuestResult,
  splitLockedResult,
  toBirthDate,
} from './utils/profile'

let guestResultAdoption = ''
let guestReadingInserted = false

function takeGuestResult() {
  if (guestResultAdoption) return guestResultAdoption
  const stored = loadGuestResult()
  if (stored) {
    guestResultAdoption = stored
    clearGuestResult()
  }
  return guestResultAdoption
}

function scrollToResult() {
  requestAnimationFrame(() => {
    document.getElementById('saju-result')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}

function ResultBody({ blocks }) {
  return (
    <div className="result-body">
      {blocks.map((block, index) => {
        if (block.type === 'heading') {
          const HeadingTag = block.level === 1 ? 'h3' : 'h4'
          return (
            <HeadingTag
              key={index}
              className={`result-heading result-heading-${block.level}`}
            >
              {renderRichText(block.text)}
            </HeadingTag>
          )
        }

        if (block.type === 'list') {
          return (
            <ul key={index} className="result-list">
              {block.items.map((item, itemIndex) => (
                <li key={itemIndex}>{renderRichText(item)}</li>
              ))}
            </ul>
          )
        }

        return (
          <p key={index} className="result-paragraph">
            {renderRichText(block.text)}
          </p>
        )
      })}
    </div>
  )
}

function App() {
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [readings, setReadings] = useState([])
  const [selectedReadingId, setSelectedReadingId] = useState(null)
  const [shareToken, setShareToken] = useState(null)
  const [shareCopied, setShareCopied] = useState(false)

  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  const [profile, setProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(false)
  const [profileModal, setProfileModal] = useState(null)
  const [guestDraft, setGuestDraft] = useState(() => loadGuestDraft())

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('saju-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light'
    )
    localStorage.setItem('saju-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  useEffect(() => {
    if (user) return
    saveGuestDraft(guestDraft)
  }, [guestDraft, user])

  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      setAuthReady(true)
      setProfileReady(true)
      setError(
        import.meta.env.PROD
          ? 'Supabase 환경 변수가 없습니다. Vercel → Settings → Environment Variables에 VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY를 넣고 Redeploy 하세요.'
          : 'Supabase 환경 변수가 없습니다. .env의 VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY를 확인한 뒤 npm run dev를 다시 시작하세요.'
      )
      return undefined
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setUser(data.session?.user ?? null)
      setAuthReady(true)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setAuthReady(true)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const saveProfileRow = async (currentUser, payload) => {
    const { data, error: saveError } = await supabase
      .from('users')
      .upsert(payload, { onConflict: 'id' })
      .select(
        'id, name, birth_year, birth_month, birth_day, birth_date, birth_time, gender, calendar_type'
      )
      .single()

    if (saveError || !data) {
      console.error(saveError)
      throw new Error('프로필 저장에 실패했습니다.')
    }

    return data
  }

  const saveReadingForUser = async (
    currentUser,
    answer,
    editingId = null,
    snapshot = {}
  ) => {
    if (editingId) {
      const { data: updated, error: updateError } = await supabase
        .from('saju_readings')
        .update({ result: answer, ...snapshot })
        .eq('id', editingId)
        .eq('user_id', currentUser.id)
        .select('id, share_token')
        .single()

      if (updateError) {
        console.error(updateError)
        setError('사주 결과는 나왔지만 수정 저장에 실패했습니다.')
        return { id: editingId, share_token: null }
      }
      return {
        id: editingId,
        share_token: updated?.share_token ?? null,
      }
    }

    const { data: saved, error: saveError } = await supabase
      .from('saju_readings')
      .insert({
        user_id: currentUser.id,
        result: answer,
        ...snapshot,
      })
      .select('id, share_token')
      .single()

    if (saveError) {
      console.error(saveError)
      setError('사주 결과는 나왔지만 저장에 실패했습니다.')
      return null
    }

    return {
      id: saved?.id ?? null,
      share_token: saved?.share_token ?? null,
    }
  }

  const loadReadings = async (currentUser) => {
    if (!currentUser) {
      setReadings([])
      return
    }

    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('id, created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error(fetchError)
      return
    }

    setReadings(data ?? [])
  }

  const loadProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      setProfileReady(true)
      setProfileModal(null)
      return
    }

    setProfileReady(false)
    const guestDraftSaved = loadGuestDraft()
    const guestResult = takeGuestResult()

    const { data, error: fetchError } = await supabase
      .from('users')
      .select(
        'id, name, birth_year, birth_month, birth_day, birth_date, birth_time, gender, calendar_type'
      )
      .eq('id', currentUser.id)
      .maybeSingle()

    if (fetchError) {
      console.error(fetchError)
      setError('프로필을 불러오지 못했습니다.')
      setProfile(null)
      setProfileReady(true)
      setProfileModal('onboarding')
      return
    }

    let nextProfile = data
    if (!isProfileComplete(data) && isDraftComplete(guestDraftSaved)) {
      try {
        nextProfile = await saveProfileRow(
          currentUser,
          draftToPayload(currentUser.id, guestDraftSaved)
        )
        clearGuestDraft()
      } catch (err) {
        console.error(err)
        setError('게스트 입력을 프로필로 저장하지 못했습니다.')
      }
    }

    if (isProfileComplete(nextProfile) && guestResult && !guestReadingInserted) {
      guestReadingInserted = true
      setResult(guestResult)
      const saved = await saveReadingForUser(
        currentUser,
        guestResult,
        null,
        readingSnapshotFromProfile(nextProfile)
      )
      if (saved?.id) setSelectedReadingId(saved.id)
      setShareToken(saved?.share_token ?? null)
      await loadReadings(currentUser)
      scrollToResult()
    }

    if (isProfileComplete(nextProfile)) {
      clearGuestDraft()
    }

    if (!isProfileComplete(nextProfile)) {
      setProfile(isDraftComplete(guestDraftSaved) ? null : nextProfile)
      setProfileReady(true)
      setProfileModal('onboarding')
      return
    }

    setProfile(nextProfile)
    setProfileReady(true)
    setProfileModal((current) => (current === 'onboarding' ? null : current))
  }

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      setReadings([])
      setSelectedReadingId(null)
      setShareToken(null)
      setProfile(null)
      setProfileReady(true)
      setProfileModal(null)
      return
    }
    loadProfile(user)
    loadReadings(user)
  }, [authReady, user])

  const handleGoogleLogin = async () => {
    setError('')
    saveGuestDraft(guestDraft)
    if (result) saveGuestResult(result)
    const { error: loginError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    })
    if (loginError) {
      console.error(loginError)
      setError('구글 로그인에 실패했습니다.')
    }
  }

  const handleLogout = async () => {
    setError('')
    const { error: logoutError } = await supabase.auth.signOut()
    if (logoutError) {
      console.error(logoutError)
      setError('로그아웃에 실패했습니다.')
      return
    }
    setReadings([])
    setSelectedReadingId(null)
    setShareToken(null)
    setShareCopied(false)
    setResult('')
    setProfile(null)
    setProfileModal(null)
  }

  const handleSaveProfile = async (payload) => {
    const data = await saveProfileRow(user, payload)
    setProfile(data)
    setProfileModal(null)
    setError('')
    clearGuestDraft()
  }

  const handleSelectReading = async (readingId) => {
    setError('')
    setSelectedReadingId(readingId)

    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('id, result, share_token')
      .eq('id', readingId)
      .single()

    if (fetchError || !data) {
      console.error(fetchError)
      setError('저장된 사주를 불러오지 못했습니다.')
      return
    }

    setResult(data.result ?? '')
    setShareToken(data.share_token ?? null)
    scrollToResult()
  }

  const activeInfo = isProfileComplete(profile)
    ? {
        name: profile.name,
        birthDate: profile.birth_date,
        birthYear: profile.birth_year,
        birthMonth: profile.birth_month,
        birthDay: profile.birth_day,
        birthTime: profile.birth_time,
        gender: profile.gender,
        calendarType: profile.calendar_type,
      }
    : {
        name: guestDraft.name.trim(),
        birthDate: toBirthDate(
          guestDraft.birthYear,
          guestDraft.birthMonth,
          guestDraft.birthDay
        ),
        birthYear: guestDraft.birthYear,
        birthMonth: guestDraft.birthMonth,
        birthDay: guestDraft.birthDay,
        birthTime: guestDraft.birthTime,
        gender: guestDraft.gender,
        calendarType: guestDraft.calendarType,
      }

  const calendarLabel = calendarLabelOf(activeInfo.calendarType) || '(아직 선택 없음)'
  const birthDateLabel =
    activeInfo.birthYear && activeInfo.birthMonth && activeInfo.birthDay
      ? `${activeInfo.birthYear}년 ${activeInfo.birthMonth}월 ${activeInfo.birthDay}일`
      : '(아직 입력 없음)'

  const guestReady = isDraftComplete(guestDraft)
  const canAnalyze = user ? isProfileComplete(profile) : guestReady
  const isGuestPreview = Boolean(result && !user)
  const { preview, locked } = isGuestPreview
    ? splitLockedResult(result)
    : { preview: result, locked: '' }
  const lockedBlocks = locked ? parseResultBlocks(locked) : []
  const guestMissingHint = guestReady
    ? ''
    : `${getMissingProfileFields(guestDraft).join(' · ')}을(를) 입력해 주세요`

  const handleAnalyze = async () => {
    if (!canAnalyze) {
      setError('모든 항목을 입력해 주세요.')
      return
    }

    const editingId = user ? selectedReadingId : null
    setIsLoading(true)
    setError('')
    setResult('')

    try {
      const prompt = buildSajuPrompt({
        name: activeInfo.name,
        birth: activeInfo.birthDate,
        time: activeInfo.birthTime,
        gender: activeInfo.gender,
        calendar: calendarLabel,
      })

      const answer = await askGemini(prompt)
      setResult(answer)
      setIsLoading(false)
      scrollToResult()

      if (!user) {
        saveGuestDraft(guestDraft)
        saveGuestResult(answer)
        return
      }

      const saved = await saveReadingForUser(
        user,
        answer,
        editingId,
        readingSnapshotFromProfile(profile)
      )
      if (saved?.id) setSelectedReadingId(saved.id)
      setShareToken(saved?.share_token ?? null)
      await loadReadings(user)
    } catch (err) {
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const handleNewSaju = () => {
    setResult('')
    setError('')
    setSelectedReadingId(null)
    setShareToken(null)
    setShareCopied(false)
    if (!user) clearGuestResult()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleShare = async () => {
    if (!user || !selectedReadingId) {
      setError('저장된 사주만 공유할 수 있습니다. Google 로그인 후 다시 시도해 주세요.')
      return
    }

    setError('')
    try {
      const snapshot = readingSnapshotFromProfile(profile)
      const { data, error: shareError } = await supabase
        .from('saju_readings')
        .update(snapshot)
        .eq('id', selectedReadingId)
        .eq('user_id', user.id)
        .select('share_token')
        .single()

      if (shareError || !data?.share_token) {
        console.error(shareError)
        setError('공유 링크를 만들지 못했습니다.')
        return
      }

      setShareToken(data.share_token)
      await copyToClipboard(buildShareUrl(data.share_token || shareToken))
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
    } catch (err) {
      console.error(err)
      setError('링크 복사에 실패했습니다.')
    }
  }

  const handleDeleteReading = async (readingId) => {
    if (!user) return
    const id = readingId ?? selectedReadingId
    if (!id) return

    const ok = window.confirm('이 사주 기록을 삭제할까요?')
    if (!ok) return

    setError('')
    const { error: deleteError } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (deleteError) {
      console.error(deleteError)
      setError('기록 삭제에 실패했습니다.')
      return
    }

    if (selectedReadingId === id) {
      handleNewSaju()
    }
    await loadReadings(user)
  }

  const userLabel =
    profile?.name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email ||
    '로그인됨'

  const suggestedName =
    guestDraft.name.trim() ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    ''

  const showOnboarding =
    Boolean(user && profileReady && profileModal === 'onboarding')
  const showEditModal = Boolean(user && profileModal === 'edit')

  return (
    <div className="page">
      <Atmosphere />

      {isLoading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-panel">
            <Mascot size="loading" mood="reading" />
            <p className="loading-title">미가 사주를 읽고 있습니다</p>
            <p className="loading-sub">명식을 세우고 성격을 해석하는 중…</p>
            <div className="loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      {(showOnboarding || showEditModal) && (
        <ProfileModal
          mode={showOnboarding ? 'onboarding' : 'edit'}
          userId={user.id}
          initialProfile={profile || (isDraftComplete(guestDraft) ? null : {
            name: guestDraft.name,
            birth_year: guestDraft.birthYear,
            birth_month: guestDraft.birthMonth,
            birth_day: guestDraft.birthDay,
            birth_time: guestDraft.birthTime,
            gender: guestDraft.gender,
            calendar_type: guestDraft.calendarType,
          })}
          suggestedName={suggestedName}
          onSave={handleSaveProfile}
          onClose={showOnboarding ? undefined : () => setProfileModal(null)}
        />
      )}

      <aside className="history-sidebar" aria-label="저장된 사주 기록">
        <div className="history-header">
          <h2 className="history-title">내 기록</h2>
          <button
            type="button"
            className="new-saju-btn"
            onClick={handleNewSaju}
            disabled={isLoading || (!user && !result)}
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
                  onClick={() => handleSelectReading(reading.id)}
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
                    handleDeleteReading(reading.id)
                  }}
                >
                  삭제
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <header className="topbar">
        <p className="brand">
          <Mascot size="brand" />
          사주미
        </p>
        <div className="topbar-actions">
          {authReady &&
            (user ? (
              <>
                <span className="user-chip" title={user.email || ''}>
                  {userLabel}
                </span>
                {isProfileComplete(profile) && (
                  <button
                    type="button"
                    className="auth-btn"
                    onClick={() => setProfileModal('edit')}
                    disabled={isLoading}
                  >
                    프로필
                  </button>
                )}
                <button
                  type="button"
                  className="auth-btn"
                  onClick={handleLogout}
                  disabled={isLoading}
                >
                  로그아웃
                </button>
              </>
            ) : (
              <button
                type="button"
                className="auth-btn auth-btn-google"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                Google 로그인
              </button>
            ))}
          <button
            type="button"
            className="theme-toggle"
            onClick={() => setIsDark((prev) => !prev)}
            aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          >
            {isDark ? '라이트' : '다크'}
          </button>
        </div>
      </header>

      <main className="app">
        <section className="hero">
          <Mascot size="lg" decorative={false} />
          <h1 className="hero-title">사주미</h1>
          <p className="hero-sub">달토끼 미가 출생 정보로 성격과 기질을 읽어 드립니다.</p>
          <AnalysisCount refreshKey={readings.length} />
        </section>

        {!user && (
          <section className="form-section" aria-label="사주 입력">
            <p className="guest-hint">
              로그인 없이 먼저 사주를 볼 수 있어요. 전체 해석과 저장은 Google 로그인 후 열려요.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!isLoading && guestReady) handleAnalyze()
              }}
            >
              <SajuFields
                idPrefix="guest"
                draft={guestDraft}
                onChange={setGuestDraft}
                disabled={isLoading}
              />
              {!guestReady && <p className="form-hint">{guestMissingHint}</p>}
              <div className="form-actions">
                <button
                  type="submit"
                  className="analyze-btn"
                  disabled={isLoading || !guestReady}
                >
                  사주 보기
                </button>
              </div>
            </form>
          </section>
        )}

        {user && profileReady && isProfileComplete(profile) && (
          <>
            {selectedReadingId && (
              <div className="viewing-badge" role="status">
                <span>저장된 기록 보는 중</span>
                <div className="viewing-badge-actions">
                  <button
                    type="button"
                    className="viewing-badge-action is-danger"
                    onClick={() => handleDeleteReading(selectedReadingId)}
                    disabled={isLoading || !user}
                  >
                    삭제
                  </button>
                  <button
                    type="button"
                    className="viewing-badge-action"
                    onClick={handleNewSaju}
                    disabled={isLoading || !user}
                  >
                    새 사주
                  </button>
                </div>
              </div>
            )}

            <section className="profile-card" aria-label="내 사주 정보">
              <div className="profile-card-header">
                <div>
                  <p className="profile-card-eyebrow">내 사주 정보</p>
                  <h2 className="profile-card-name">{profile.name}</h2>
                </div>
                <button
                  type="button"
                  className="profile-edit-btn"
                  onClick={() => setProfileModal('edit')}
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
                onClick={handleAnalyze}
                disabled={isLoading || !canAnalyze}
              >
                {selectedReadingId ? '다시 분석하기' : '사주 보기'}
              </button>
            </section>
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
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                  >
                    Google로 전체 보기
                  </button>
                </div>
              </div>
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

export default App
