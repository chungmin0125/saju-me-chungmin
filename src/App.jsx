import { useEffect, useState } from 'react'
import './App.css'
import { buildSajuPrompt } from './prompts/buildSajuPrompt'
import { askGemini } from './api/gemini'
import { parseResultBlocks, renderRichText } from './utils/formatSajuResult'
import { supabase, isSupabaseConfigured } from './lib/supabase'
import ProfileModal from './components/ProfileModal'
import Mascot from './components/Mascot'
import {
  calendarLabelOf,
  formatBirthDateLabel,
  formatReadingWhen,
  genderLabelOf,
  isProfileComplete,
} from './utils/profile'

function scrollToResult() {
  requestAnimationFrame(() => {
    document.getElementById('saju-result')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}

function App() {
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const [readings, setReadings] = useState([])
  const [selectedReadingId, setSelectedReadingId] = useState(null)

  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(false)

  const [profile, setProfile] = useState(null)
  const [profileReady, setProfileReady] = useState(false)
  const [profileModal, setProfileModal] = useState(null)

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

  const loadProfile = async (currentUser) => {
    if (!currentUser) {
      setProfile(null)
      setProfileReady(true)
      setProfileModal(null)
      return
    }

    setProfileReady(false)
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

    if (!isProfileComplete(data)) {
      setProfile(null)
      setProfileReady(true)
      setProfileModal('onboarding')
      return
    }

    setProfile(data)
    setProfileReady(true)
    setProfileModal((current) => (current === 'onboarding' ? null : current))
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

  useEffect(() => {
    if (!authReady) return
    if (!user) {
      setReadings([])
      setSelectedReadingId(null)
      setResult('')
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
    setResult('')
    setProfile(null)
    setProfileModal(null)
  }

  const handleSaveProfile = async (payload) => {
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

    setProfile(data)
    setProfileModal(null)
    setError('')
  }

  const handleSelectReading = async (readingId) => {
    setError('')
    setSelectedReadingId(readingId)

    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('id, result')
      .eq('id', readingId)
      .single()

    if (fetchError || !data) {
      console.error(fetchError)
      setError('저장된 사주를 불러오지 못했습니다.')
      return
    }

    setResult(data.result ?? '')
    scrollToResult()
  }

  const calendarLabel = calendarLabelOf(profile?.calendar_type) || '(아직 선택 없음)'
  const birthDateLabel = profile
    ? `${profile.birth_year}년 ${profile.birth_month}월 ${profile.birth_day}일`
    : '(아직 입력 없음)'

  const resultBlocks = result ? parseResultBlocks(result) : []
  const canAnalyze = Boolean(user && isProfileComplete(profile))

  const handleAnalyze = async () => {
    if (!user) {
      setError('구글 로그인 후 사주를 저장할 수 있습니다.')
      return
    }
    if (!isProfileComplete(profile)) {
      setError('프로필 정보를 먼저 입력해 주세요.')
      setProfileModal('onboarding')
      return
    }

    const editingId = selectedReadingId
    setIsLoading(true)
    setError('')
    setResult('')

    try {
      const prompt = buildSajuPrompt({
        name: profile.name,
        birth: profile.birth_date,
        time: profile.birth_time,
        gender: profile.gender,
        calendar: calendarLabel,
      })

      const answer = await askGemini(prompt)
      setResult(answer)
      setIsLoading(false)
      scrollToResult()

      if (editingId) {
        const { error: updateError } = await supabase
          .from('saju_readings')
          .update({ result: answer })
          .eq('id', editingId)
          .eq('user_id', user.id)

        if (updateError) {
          console.error(updateError)
          setError('사주 결과는 나왔지만 수정 저장에 실패했습니다.')
        } else {
          setSelectedReadingId(editingId)
          await loadReadings(user)
        }
      } else {
        const { data: saved, error: saveError } = await supabase
          .from('saju_readings')
          .insert({
            user_id: user.id,
            result: answer,
          })
          .select('id')
          .single()

        if (saveError) {
          console.error(saveError)
          setError('사주 결과는 나왔지만 저장에 실패했습니다.')
        } else {
          if (saved?.id) setSelectedReadingId(saved.id)
          await loadReadings(user)
        }
      }
    } catch (err) {
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const handleNewSaju = () => {
    setResult('')
    setError('')
    setSelectedReadingId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
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
    user?.user_metadata?.full_name || user?.user_metadata?.name || ''

  const showOnboarding =
    Boolean(user && profileReady && profileModal === 'onboarding')
  const showEditModal = Boolean(user && profileModal === 'edit')

  return (
    <div className="page">
      <div className="atmosphere" aria-hidden="true">
        <span className="space-dust" />
        <span className="nebula nebula-a" />
        <span className="nebula nebula-b" />
        <span className="nebula nebula-c" />
        <span className="blackhole">
          <span className="blackhole-halo" />
          <span className="blackhole-disk" />
          <span className="blackhole-core" />
          <span className="blackhole-shine" />
        </span>
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
        <span className="star star-1" />
        <span className="star star-2" />
        <span className="star star-3" />
        <span className="star star-4" />
        <span className="star star-5" />
        <span className="star star-6" />
        <span className="star star-7" />
        <span className="star star-8" />
        <span className="star star-9" />
        <span className="star star-10" />
        <span className="star star-11" />
        <span className="star star-12" />
      </div>

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
          initialProfile={profile}
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
            disabled={isLoading || !canAnalyze}
          >
            새 사주
          </button>
        </div>
        {!user ? (
          <div className="history-empty-wrap">
            <Mascot size="sm" />
            <p className="history-empty">로그인하면 내 사주 기록이 여기에 모입니다.</p>
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
        </section>

        {authReady && !user && (
          <div className="login-gate" role="status">
            <Mascot size="sm" />
            <p>구글 계정으로 로그인하면 사주 정보가 저장되고, 다음부터는 바로 볼 수 있습니다.</p>
            <button
              type="button"
              className="auth-btn auth-btn-google"
              onClick={handleGoogleLogin}
            >
              Google로 계속하기
            </button>
          </div>
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

        {user && profileReady && !isProfileComplete(profile) && !showOnboarding && (
          <div className="login-gate" role="status">
            <Mascot size="sm" />
            <p>사주를 보려면 출생 정보를 먼저 입력해 주세요.</p>
            <button
              type="button"
              className="auth-btn auth-btn-google"
              onClick={() => setProfileModal('onboarding')}
            >
              정보 입력하기
            </button>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </main>

      {result && (
        <section
          id="saju-result"
          className="result"
          aria-label="사주 해석 결과"
        >
          <div className="result-header">
            <p className="result-eyebrow">사주 해석</p>
            <h2 className="result-title">
              {profile?.name ? `${profile.name}님의 기운` : '당신의 기운'}
            </h2>
            <p className="result-meta">
              {birthDateLabel}
              {profile?.birth_time ? ` · ${profile.birth_time}` : ''}
              {calendarLabel !== '(아직 선택 없음)'
                ? ` · ${calendarLabel}`
                : ''}
            </p>
            <div className="result-ornament" aria-hidden="true">
              <span />
              <span className="result-ornament-dot" />
              <span />
            </div>
          </div>

          <div className="result-body">
            {resultBlocks.map((block, index) => {
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

          <div className="result-actions">
            {selectedReadingId && (
              <button
                type="button"
                className="result-delete-btn"
                onClick={() => handleDeleteReading(selectedReadingId)}
                disabled={isLoading || !user}
              >
                이 기록 삭제
              </button>
            )}
            <button
              type="button"
              className="result-new-btn"
              onClick={handleNewSaju}
              disabled={isLoading || !user}
            >
              새 사주 만들기
            </button>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
