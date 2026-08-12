import { useEffect, useState } from 'react'
import './App.css'
import { buildSajuPrompt } from './prompts/buildSajuPrompt'
import { askGemini } from './api/gemini'
import { parseResultBlocks, renderRichText } from './utils/formatSajuResult'
import { supabase } from './lib/supabase'

function daysInMonth(year, month) {
  const y = Number(year)
  const m = Number(month)
  if (!m) return 31
  if (!y || String(year).length !== 4) {
    return new Date(2024, m, 0).getDate()
  }
  return new Date(y, m, 0).getDate()
}

function formatBirthDateLabel(birthDate) {
  if (!birthDate) return ''
  const [y, m, d] = birthDate.split('-')
  if (!y || !m || !d) return birthDate
  return `${y}.${Number(m)}.${Number(d)}`
}

function scrollToResult() {
  requestAnimationFrame(() => {
    document.getElementById('saju-result')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}

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

  // --- 저장된 사주 기록 (사이드바) ---
  const [readings, setReadings] = useState([])
  const [selectedReadingId, setSelectedReadingId] = useState(null)

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

  const maxDay = daysInMonth(birthYear, birthMonth)

  // 월/연이 바뀌어 일수가 줄어들면 잘못된 일 선택을 비웁니다.
  useEffect(() => {
    if (birthDay && Number(birthDay) > maxDay) {
      setBirthDay('')
    }
  }, [birthDay, maxDay])

  const loadReadings = async () => {
    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select('id, name, birth_date, created_at')
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error(fetchError)
      return
    }

    setReadings(data ?? [])
  }

  useEffect(() => {
    loadReadings()
  }, [])

  const handleSelectReading = async (readingId) => {
    setError('')
    setSelectedReadingId(readingId)

    const { data, error: fetchError } = await supabase
      .from('saju_readings')
      .select(
        'id, name, birth_year, birth_month, birth_day, birth_date, birth_time, gender, calendar_type, result'
      )
      .eq('id', readingId)
      .single()

    if (fetchError || !data) {
      console.error(fetchError)
      setError('저장된 사주를 불러오지 못했습니다.')
      return
    }

    setName(data.name ?? '')
    setBirthYear(data.birth_year ?? '')
    setBirthMonth(data.birth_month ?? '')
    setBirthDay(data.birth_day ?? '')
    setBirthTime(data.birth_time ?? '')
    setGender(data.gender ?? '')
    setCalendarType(data.calendar_type ?? '')
    setResult(data.result ?? '')
    scrollToResult()
  }

  const handleNameChange = (e) => setName(e.target.value)
  // 숫자만 남기고 연/월/일 상태를 업데이트합니다.
  const handleBirthYearChange = (e) =>
    setBirthYear(e.target.value.replace(/\D/g, '').slice(0, 4))
  const handleBirthMonthChange = (e) => setBirthMonth(e.target.value)
  const handleBirthDayChange = (e) => setBirthDay(e.target.value)
  const handleBirthTimeChange = (e) => setBirthTime(e.target.value)
  const handleGenderChange = (e) => setGender(e.target.value)
  const handleCalendarTypeChange = (e) => setCalendarType(e.target.value)

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

  const missingFields = []
  if (!name) missingFields.push('이름')
  if (birthYear.length !== 4 || !birthMonth || !birthDay) {
    missingFields.push('생년월일')
  }
  if (!birthTime) missingFields.push('태어난 시간')
  if (!gender) missingFields.push('성별')
  if (!calendarType) missingFields.push('양력/음력')

  const isFormReady = missingFields.length === 0
  const missingHint =
    missingFields.length > 0
      ? `${missingFields.join(' · ')}을(를) 입력해 주세요`
      : ''

  // 결과 글을 제목 / 문단 / 글머리 목록으로 나눕니다.
  const resultBlocks = result ? parseResultBlocks(result) : []

  const handleAnalyze = async () => {
    if (!isFormReady) {
      setError('모든 항목을 입력해 주세요.')
      return
    }

    const editingId = selectedReadingId
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
      setIsLoading(false)
      scrollToResult()

      const payload = {
        name,
        birth_year: birthYear,
        birth_month: birthMonth,
        birth_day: birthDay,
        birth_date: birthDate,
        birth_time: birthTime,
        gender,
        calendar_type: calendarType,
        result: answer,
      }

      if (editingId) {
        // Update: 기존 기록에 새 분석 결과 반영
        const { error: updateError } = await supabase
          .from('saju_readings')
          .update(payload)
          .eq('id', editingId)

        if (updateError) {
          console.error(updateError)
          setError('사주 결과는 나왔지만 수정 저장에 실패했습니다.')
        } else {
          setSelectedReadingId(editingId)
          await loadReadings()
        }
      } else {
        // Create: 새 기록 추가
        const { data: saved, error: saveError } = await supabase
          .from('saju_readings')
          .insert(payload)
          .select('id')
          .single()

        if (saveError) {
          console.error(saveError)
          setError('사주 결과는 나왔지만 저장에 실패했습니다.')
        } else {
          if (saved?.id) setSelectedReadingId(saved.id)
          await loadReadings()
        }
      }
    } catch (err) {
      setError(err.message || '사주 분석 중 오류가 발생했습니다.')
      setIsLoading(false)
    }
  }

  const handleFormKeyDown = (e) => {
    if (e.key !== 'Enter') return
    if (e.target.tagName === 'TEXTAREA') return
    e.preventDefault()
    if (!isLoading && isFormReady) {
      handleAnalyze()
    }
  }

  const handleNewSaju = () => {
    setName('')
    setBirthYear('')
    setBirthMonth('')
    setBirthDay('')
    setBirthTime('')
    setGender('')
    setCalendarType('')
    setResult('')
    setError('')
    setSelectedReadingId(null)

    requestAnimationFrame(() => {
      document.getElementById('name')?.focus()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  const readingPayload = () => ({
    name,
    birth_year: birthYear,
    birth_month: birthMonth,
    birth_day: birthDay,
    birth_date: birthDate,
    birth_time: birthTime,
    gender,
    calendar_type: calendarType,
    result,
  })

  // Update: 선택된 기록의 입력값·결과를 현재 폼 내용으로 수정
  const handleUpdateReading = async () => {
    if (!selectedReadingId) return
    if (!isFormReady || !result) {
      setError('수정하려면 입력과 사주 결과가 모두 있어야 합니다.')
      return
    }

    setError('')
    const { error: updateError } = await supabase
      .from('saju_readings')
      .update(readingPayload())
      .eq('id', selectedReadingId)

    if (updateError) {
      console.error(updateError)
      setError('기록 수정에 실패했습니다.')
      return
    }

    await loadReadings()
  }

  // Delete: 선택된 기록(또는 사이드바에서 지정한 기록) 삭제
  const handleDeleteReading = async (readingId) => {
    const id = readingId ?? selectedReadingId
    if (!id) return

    const ok = window.confirm('이 사주 기록을 삭제할까요?')
    if (!ok) return

    setError('')
    const { error: deleteError } = await supabase
      .from('saju_readings')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error(deleteError)
      setError('기록 삭제에 실패했습니다.')
      return
    }

    if (selectedReadingId === id) {
      handleNewSaju()
    }
    await loadReadings()
  }

  return (
    <div className="page">
      {/* 몽환적인 배경 레이어 (장식용) */}
      <div className="atmosphere" aria-hidden="true">
        <span className="mist mist-a" />
        <span className="mist mist-b" />
        <span className="mist mist-c" />
        <span className="orb orb-a" />
        <span className="orb orb-b" />
        <span className="orb orb-c" />
        <span className="star star-1" />
        <span className="star star-2" />
        <span className="star star-3" />
        <span className="star star-4" />
        <span className="star star-5" />
        <span className="star star-6" />
      </div>

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

      <aside className="history-sidebar" aria-label="저장된 사주 기록">
        <div className="history-header">
          <h2 className="history-title">기록</h2>
          <button
            type="button"
            className="new-saju-btn"
            onClick={handleNewSaju}
            disabled={isLoading}
          >
            새 사주
          </button>
        </div>
        {readings.length === 0 ? (
          <p className="history-empty">아직 저장된 이름이 없습니다.</p>
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
                  <span className="history-name">{reading.name}</span>
                  {reading.birth_date && (
                    <span className="history-meta">
                      {formatBirthDateLabel(reading.birth_date)}
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  className="history-delete-btn"
                  aria-label={`${reading.name} 기록 삭제`}
                  title="삭제"
                  disabled={isLoading}
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

        {selectedReadingId && (
          <div className="viewing-badge" role="status">
            <span>저장된 기록 보는 중</span>
            <div className="viewing-badge-actions">
              <button
                type="button"
                className="viewing-badge-action"
                onClick={handleUpdateReading}
                disabled={isLoading || !isFormReady || !result}
              >
                수정 저장
              </button>
              <button
                type="button"
                className="viewing-badge-action is-danger"
                onClick={() => handleDeleteReading(selectedReadingId)}
                disabled={isLoading}
              >
                삭제
              </button>
              <button
                type="button"
                className="viewing-badge-action"
                onClick={handleNewSaju}
                disabled={isLoading}
              >
                새 사주
              </button>
            </div>
          </div>
        )}

        <section
          className="form-section"
          aria-label="사주 입력"
          onKeyDown={handleFormKeyDown}
        >
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
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
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

          <div className="form-actions">
            <button
              type="button"
              className="analyze-btn"
              onClick={handleAnalyze}
              disabled={isLoading || !isFormReady}
            >
              {selectedReadingId ? '다시 분석하기' : '사주 보기'}
            </button>
            {!isFormReady && !isLoading && (
              <p className="form-hint">{missingHint}</p>
            )}
            {selectedReadingId && (
              <button
                type="button"
                className="update-btn"
                onClick={handleUpdateReading}
                disabled={isLoading || !isFormReady || !result}
              >
                수정 저장
              </button>
            )}
            <button
              type="button"
              className="clear-btn"
              onClick={handleNewSaju}
              disabled={isLoading}
            >
              입력 비우기
            </button>
          </div>
        </section>

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
              {name ? `${name}님의 기운` : '당신의 기운'}
            </h2>
            <p className="result-meta">
              {birthDateLabel}
              {birthTime ? ` · ${birthTime}` : ''}
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
              <>
                <button
                  type="button"
                  className="result-update-btn"
                  onClick={handleUpdateReading}
                  disabled={isLoading || !isFormReady || !result}
                >
                  수정 저장
                </button>
                <button
                  type="button"
                  className="result-delete-btn"
                  onClick={() => handleDeleteReading(selectedReadingId)}
                  disabled={isLoading}
                >
                  이 기록 삭제
                </button>
              </>
            )}
            <button
              type="button"
              className="result-new-btn"
              onClick={handleNewSaju}
              disabled={isLoading}
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
