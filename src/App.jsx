import { useEffect, useState } from 'react'
import './App.css'
import { buildSajuPrompt } from './prompts/buildSajuPrompt'
import { askGemini } from './api/gemini'

function App() {
  // --- 각 입력값을 저장하는 상태 ---
  const [name, setName] = useState('')
  const [birthYear, setBirthYear] = useState('') // 연 (예: 1998)
  const [birthMonth, setBirthMonth] = useState('') // 월 (1~12)
  const [birthDay, setBirthDay] = useState('') // 일 (1~31)
  const [birthTime, setBirthTime] = useState('')
  const [gender, setGender] = useState('')
  const [calendarType, setCalendarType] = useState('')

  // --- API 결과 관련 상태 ---
  const [result, setResult] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // --- 다크모드 상태 (localStorage에 저장해서 새로고침해도 유지) ---
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('saju-theme')
    if (saved) return saved === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // isDark가 바뀔 때마다 <html>에 data-theme을 붙입니다.
  useEffect(() => {
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light'
    )
    localStorage.setItem('saju-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  const handleNameChange = (e) => setName(e.target.value)
  // 숫자만 남기고 연/월/일 상태를 업데이트합니다.
  const handleBirthYearChange = (e) =>
    setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))
  const handleBirthMonthChange = (e) => setBirthMonth(e.target.value)
  const handleBirthDayChange = (e) => setBirthDay(e.target.value)
  const handleBirthTimeChange = (e) => setBirthTime(e.target.value)
  const handleGenderChange = (e) => setGender(e.target.value)
  const handleCalendarTypeChange = (e) => setCalendarType(e.target.value)

  const genderLabel =
    gender === 'male' ? '남성' : gender === 'female' ? '여성' : '(아직 선택 없음)'

  const calendarLabel =
    calendarType === 'solar'
      ? '양력'
      : calendarType === 'lunar'
        ? '음력'
        : '(아직 선택 없음)'

  // 연·월·일을 합쳐 "1998-03-15" 형식으로 만듭니다. (API/미리보기용)
  const birthDate =
    birthYear && birthMonth && birthDay
      ? `${birthYear}-${String(birthMonth).padStart(2, '0')}-${String(birthDay).padStart(2, '0')}`
      : ''

  const birthDateLabel =
    birthYear && birthMonth && birthDay
      ? `${birthYear}년 ${birthMonth}월 ${birthDay}일`
      : '(아직 입력 없음)'

  const isFormReady =
    name &&
    birthYear.length === 4 &&
    birthMonth &&
    birthDay &&
    birthTime &&
    gender &&
    calendarType

  const handleAnalyze = async () => {
    if (!isFormReady) {
      setError('모든 항목을 입력해 주세요.')
      return
    }

    setIsLoading(true)
    setError('')
    setResult('')

    try {
      const prompt = buildSajuPrompt({
        name,
        birth: birthDate,
        time: birthTime,
        gender,
        calendar: calendarLabel,
      })

      const answer = await askGemini(prompt)
      setResult(answer)
    } catch (err) {
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="page">
      {/* 분석 중 전체 화면 로딩 오버레이 */}
      {isLoading && (
        <div className="loading-overlay" role="status" aria-live="polite">
          <div className="loading-panel">
            <div className="loading-orb" aria-hidden="true" />
            <p className="loading-title">사주를 읽고 있습니다</p>
            <p className="loading-sub">명식을 세우고 성격을 해석하는 중…</p>
            <div className="loading-dots" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      )}

      <header className="topbar">
        <p className="brand">사주미</p>
        <button
          type="button"
          className="theme-toggle"
          onClick={() => setIsDark((prev) => !prev)}
          aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {isDark ? '라이트' : '다크'}
        </button>
      </header>

      <main className="app">
        <section className="hero">
          <h1 className="hero-title">사주미</h1>
          <p className="hero-sub">출생 정보로 성격과 기질을 읽어 드립니다.</p>
        </section>

        <section className="form-section" aria-label="사주 입력">
          <div className="field">
            <label htmlFor="name">이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="이름을 입력하세요"
              disabled={isLoading}
            />
          </div>

          {/* 생년월일: 연 / 월 / 일을 한 줄에 각각 입력 */}
          <div className="field">
            <span className="field-group-label" id="birth-label">
              생년월일
            </span>
            <div
              className="birth-row"
              role="group"
              aria-labelledby="birth-label"
            >
              <div className="birth-part">
                <label htmlFor="birthYear">연</label>
                <input
                  id="birthYear"
                  type="text"
                  inputMode="numeric"
                  placeholder="1998"
                  value={birthYear}
                  onChange={handleBirthYearChange}
                  disabled={isLoading}
                />
              </div>
              <div className="birth-part">
                <label htmlFor="birthMonth">월</label>
                <select
                  id="birthMonth"
                  value={birthMonth}
                  onChange={handleBirthMonthChange}
                  disabled={isLoading}
                >
                  <option value="">월</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div className="birth-part">
                <label htmlFor="birthDay">일</label>
                <select
                  id="birthDay"
                  value={birthDay}
                  onChange={handleBirthDayChange}
                  disabled={isLoading}
                >
                  <option value="">일</option>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="field">
            <label htmlFor="birthTime">태어난 시간</label>
            <input
              id="birthTime"
              type="time"
              value={birthTime}
              onChange={handleBirthTimeChange}
              disabled={isLoading}
            />
          </div>

          <div className="field-row">
            <div className="field">
              <label htmlFor="gender">성별</label>
              <select
                id="gender"
                value={gender}
                onChange={handleGenderChange}
                disabled={isLoading}
              >
                <option value="">선택하세요</option>
                <option value="male">남성</option>
                <option value="female">여성</option>
              </select>
            </div>

            <div className="field">
              <label htmlFor="calendarType">양력 / 음력</label>
              <select
                id="calendarType"
                value={calendarType}
                onChange={handleCalendarTypeChange}
                disabled={isLoading}
              >
                <option value="">선택하세요</option>
                <option value="solar">양력</option>
                <option value="lunar">음력</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            className="analyze-btn"
            onClick={handleAnalyze}
            disabled={isLoading || !isFormReady}
          >
            사주 보기
          </button>
        </section>

        <section className="preview" aria-label="입력 확인">
          <h2 className="section-label">입력 확인</h2>
          <p>이름: {name || '(아직 입력 없음)'}</p>
          <p>생년월일: {birthDateLabel}</p>
          <p>태어난 시간: {birthTime || '(아직 입력 없음)'}</p>
          <p>성별: {genderLabel}</p>
          <p>양력 / 음력: {calendarLabel}</p>
        </section>

        {error && <p className="error">{error}</p>}

        {result && (
          <section className="result" aria-label="사주 해석 결과">
            <h2>사주 해석</h2>
            <pre>{result}</pre>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
