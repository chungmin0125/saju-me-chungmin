export function daysInMonth(year, month) {
  const y = Number(year)
  const m = Number(month)
  if (!m) return 31
  if (!y || String(year).length !== 4) {
    return new Date(2024, m, 0).getDate()
  }
  return new Date(y, m, 0).getDate()
}

export function formatBirthDateLabel(birthDate) {
  if (!birthDate) return ''
  const [y, m, d] = birthDate.split('-')
  if (!y || !m || !d) return birthDate
  return `${y}.${Number(m)}.${Number(d)}`
}

export function formatReadingWhen(createdAt) {
  if (!createdAt) return ''
  const date = new Date(createdAt)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = date.getMonth() + 1
  const d = date.getDate()
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${y}.${m}.${d} ${hh}:${mm}`
}

export function toBirthDate(year, month, day) {
  if (!year || !month || !day) return ''
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function calendarLabelOf(calendarType) {
  if (calendarType === 'solar') return '양력'
  if (calendarType === 'lunar') return '음력'
  return ''
}

export function genderLabelOf(gender) {
  if (gender === 'male') return '남성'
  if (gender === 'female') return '여성'
  return ''
}

export function emptyProfileDraft(overrides = {}) {
  return {
    name: '',
    birthYear: '',
    birthMonth: '',
    birthDay: '',
    birthTime: '',
    gender: '',
    calendarType: '',
    ...overrides,
  }
}

export function profileToDraft(profile) {
  if (!profile) return emptyProfileDraft()
  return {
    name: profile.name ?? '',
    birthYear: profile.birth_year ?? '',
    birthMonth: profile.birth_month ?? '',
    birthDay: profile.birth_day ?? '',
    birthTime: profile.birth_time ?? '',
    gender: profile.gender ?? '',
    calendarType: profile.calendar_type ?? '',
  }
}

export function getMissingProfileFields(draft) {
  const missing = []
  if (!draft.name?.trim()) missing.push('이름')
  if (
    String(draft.birthYear || '').length !== 4 ||
    !draft.birthMonth ||
    !draft.birthDay
  ) {
    missing.push('생년월일')
  }
  if (!draft.birthTime) missing.push('태어난 시간')
  if (!draft.gender) missing.push('성별')
  if (!draft.calendarType) missing.push('양력/음력')
  return missing
}

export function isProfileComplete(profile) {
  if (!profile) return false
  return getMissingProfileFields(profileToDraft(profile)).length === 0
}

export function draftToPayload(userId, draft) {
  const name = draft.name.trim()
  const birthDate = toBirthDate(draft.birthYear, draft.birthMonth, draft.birthDay)
  return {
    id: userId,
    name,
    birth_year: String(draft.birthYear),
    birth_month: String(draft.birthMonth),
    birth_day: String(draft.birthDay),
    birth_date: birthDate,
    birth_time: draft.birthTime,
    gender: draft.gender,
    calendar_type: draft.calendarType,
    updated_at: new Date().toISOString(),
  }
}
