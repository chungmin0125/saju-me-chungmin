import { useEffect, useState } from 'react'
import { askGemini } from '../api/gemini'
import { fetchProfile, saveProfileRow } from '../api/profile'
import {
  deleteReading,
  fetchReading,
  fetchReadings,
  publishReadingShare,
  saveReadingForUser,
} from '../api/readings'
import { trackEvent } from '../lib/analytics'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { buildSajuPrompt } from '../prompts/buildSajuPrompt'
import { parseResultBlocks } from '../utils/formatSajuResult'
import {
  hasGuestReadingInserted,
  markGuestReadingInserted,
  takeGuestResult,
} from '../utils/guestSession'
import {
  calendarLabelOf,
  clearGuestDraft,
  clearGuestResult,
  draftToPayload,
  getMissingProfileFields,
  isDraftComplete,
  isProfileComplete,
  loadGuestDraft,
  saveGuestDraft,
  saveGuestResult,
  splitLockedResult,
  toBirthDate,
} from '../utils/profile'
import { scrollToResult } from '../utils/scroll'
import {
  buildShareUrl,
  copyToClipboard,
  readingSnapshotFromProfile,
} from '../utils/share'

function supabaseMissingMessage() {
  return import.meta.env.PROD
    ? 'Supabase 환경 변수가 없습니다. Vercel → Settings → Environment Variables에 VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY를 넣고 Redeploy 하세요.'
    : 'Supabase 환경 변수가 없습니다. .env의 VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY를 확인한 뒤 npm run dev를 다시 시작하세요.'
}

export function useSajuApp() {
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

  useEffect(() => {
    if (user) return
    saveGuestDraft(guestDraft)
  }, [guestDraft, user])

  useEffect(() => {
    let mounted = true

    if (!isSupabaseConfigured) {
      setAuthReady(true)
      setProfileReady(true)
      setError(supabaseMissingMessage())
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

  const loadReadingsForUser = async (currentUser) => {
    if (!currentUser) {
      setReadings([])
      return
    }
    setReadings(await fetchReadings(currentUser.id))
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

    let data
    try {
      data = await fetchProfile(currentUser.id)
    } catch (err) {
      console.error(err)
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
          draftToPayload(currentUser.id, guestDraftSaved)
        )
        clearGuestDraft()
      } catch (err) {
        console.error(err)
        setError('게스트 입력을 프로필로 저장하지 못했습니다.')
      }
    }

    if (
      isProfileComplete(nextProfile) &&
      guestResult &&
      !hasGuestReadingInserted()
    ) {
      markGuestReadingInserted()
      setResult(guestResult)
      const saved = await saveReadingForUser(
        currentUser,
        guestResult,
        null,
        readingSnapshotFromProfile(nextProfile)
      )
      if (saved.error) setError(saved.error)
      if (saved?.id) setSelectedReadingId(saved.id)
      setShareToken(saved?.share_token ?? null)
      await loadReadingsForUser(currentUser)
      scrollToResult()
      trackEvent('convert_guest_reading')
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
    loadReadingsForUser(user)
  }, [authReady, user])

  const handleGoogleLogin = async (source = 'topbar') => {
    const loginSource = typeof source === 'string' ? source : 'topbar'
    trackEvent('login', { method: 'Google', source: loginSource })
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
      trackEvent('login_error', { method: 'Google', source: loginSource })
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
    trackEvent('logout')
    setReadings([])
    setSelectedReadingId(null)
    setShareToken(null)
    setShareCopied(false)
    setResult('')
    setProfile(null)
    setProfileModal(null)
  }

  const handleSaveProfile = async (payload, mode = 'edit') => {
    const data = await saveProfileRow(payload)
    setProfile(data)
    setProfileModal(null)
    setError('')
    clearGuestDraft()
    trackEvent('save_profile', { mode })
  }

  const handleSelectReading = async (readingId) => {
    trackEvent('select_reading')
    setError('')
    setSelectedReadingId(readingId)

    try {
      const data = await fetchReading(readingId)
      setResult(data.result ?? '')
      setShareToken(data.share_token ?? null)
      scrollToResult()
    } catch (err) {
      console.error(err)
      setError('저장된 사주를 불러오지 못했습니다.')
    }
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

  const calendarLabel =
    calendarLabelOf(activeInfo.calendarType) || '(아직 선택 없음)'
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
    const userType = user ? 'member' : 'guest'
    if (!canAnalyze) {
      setError('모든 항목을 입력해 주세요.')
      trackEvent('analyze_saju', { user_type: userType, status: 'incomplete' })
      return
    }

    const editingId = user ? selectedReadingId : null
    trackEvent('analyze_saju', {
      user_type: userType,
      status: 'start',
      is_rerun: Boolean(editingId),
    })
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
      trackEvent('analyze_saju', { user_type: userType, status: 'success' })

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
      if (saved.error) setError(saved.error)
      if (saved?.id) setSelectedReadingId(saved.id)
      setShareToken(saved?.share_token ?? null)
      await loadReadingsForUser(user)
    } catch (err) {
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
      setIsLoading(false)
      trackEvent('analyze_saju', { user_type: userType, status: 'error' })
    }
  }

  const resetCurrentReading = () => {
    setResult('')
    setError('')
    setSelectedReadingId(null)
    setShareToken(null)
    setShareCopied(false)
    if (!user) clearGuestResult()
  }

  const handleNewSaju = () => {
    trackEvent('new_saju', { user_type: user ? 'member' : 'guest' })
    resetCurrentReading()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleShare = async () => {
    if (!user || !selectedReadingId) {
      setError(
        '저장된 사주만 공유할 수 있습니다. Google 로그인 후 다시 시도해 주세요.'
      )
      trackEvent('share', {
        method: 'link',
        content_type: 'saju',
        status: 'blocked',
        source: 'result',
      })
      return
    }

    setError('')
    try {
      const snapshot = readingSnapshotFromProfile(profile)
      const nextToken = await publishReadingShare(
        user.id,
        selectedReadingId,
        snapshot
      )
      setShareToken(nextToken)
      await copyToClipboard(buildShareUrl(nextToken || shareToken))
      setShareCopied(true)
      window.setTimeout(() => setShareCopied(false), 2000)
      trackEvent('share', {
        method: 'link',
        content_type: 'saju',
        status: 'success',
        source: 'result',
      })
    } catch (err) {
      console.error(err)
      setError(err.message || '링크 복사에 실패했습니다.')
      trackEvent('share', {
        method: 'link',
        content_type: 'saju',
        status: 'error',
        source: 'result',
      })
    }
  }

  const handleDeleteReading = async (readingId) => {
    if (!user) return
    const id = readingId ?? selectedReadingId
    if (!id) return

    const ok = window.confirm('이 사주 기록을 삭제할까요?')
    if (!ok) return

    setError('')
    try {
      await deleteReading(user.id, id)
    } catch (err) {
      console.error(err)
      setError('기록 삭제에 실패했습니다.')
      return
    }

    trackEvent('delete_reading')
    if (selectedReadingId === id) {
      resetCurrentReading()
    }
    await loadReadingsForUser(user)
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

  const showOnboarding = Boolean(
    user && profileReady && profileModal === 'onboarding'
  )
  const showEditModal = Boolean(user && profileModal === 'edit')
  const showProfileCard = Boolean(
    user && profileReady && isProfileComplete(profile)
  )
  const canEditProfile = isProfileComplete(profile)

  const modalInitialProfile =
    profile ||
    (isDraftComplete(guestDraft)
      ? null
      : {
          name: guestDraft.name,
          birth_year: guestDraft.birthYear,
          birth_month: guestDraft.birthMonth,
          birth_day: guestDraft.birthDay,
          birth_time: guestDraft.birthTime,
          gender: guestDraft.gender,
          calendar_type: guestDraft.calendarType,
        })

  return {
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
    profileReady,
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
  }
}
