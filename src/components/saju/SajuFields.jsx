import { daysInMonth } from '../../utils/profile'

export default function SajuFields({
  idPrefix,
  draft,
  onChange,
  disabled = false,
  autoFocus = false,
}) {
  const maxDay = daysInMonth(draft.birthYear, draft.birthMonth)
  const id = (name) => `${idPrefix}-${name}`

  const updateField = (key) => (e) => {
    let value = e.target.value
    if (key === 'birthYear') value = value.replace(/\D/g, '').slice(0, 4)
    if (key === 'birthMonth' && draft.birthDay && Number(draft.birthDay) > daysInMonth(draft.birthYear, value)) {
      onChange({ ...draft, birthMonth: value, birthDay: '' })
      return
    }
    if (key === 'birthYear' && draft.birthDay && Number(draft.birthDay) > daysInMonth(value, draft.birthMonth)) {
      onChange({ ...draft, birthYear: value, birthDay: '' })
      return
    }
    onChange({ ...draft, [key]: value })
  }

  return (
    <>
      <div className="field">
        <label htmlFor={id('name')}>이름</label>
        <input
          id={id('name')}
          type="text"
          value={draft.name}
          onChange={updateField('name')}
          placeholder="이름을 입력하세요"
          disabled={disabled}
          autoFocus={autoFocus}
        />
      </div>

      <div className="field">
        <span className="field-group-label" id={id('birth-label')}>
          생년월일
        </span>
        <div className="birth-row" role="group" aria-labelledby={id('birth-label')}>
          <div className="birth-part">
            <label htmlFor={id('birthYear')}>연</label>
            <input
              id={id('birthYear')}
              type="text"
              inputMode="numeric"
              placeholder="1998"
              value={draft.birthYear}
              onChange={updateField('birthYear')}
              disabled={disabled}
            />
          </div>
          <div className="birth-part">
            <label htmlFor={id('birthMonth')}>월</label>
            <select
              id={id('birthMonth')}
              value={draft.birthMonth}
              onChange={updateField('birthMonth')}
              disabled={disabled}
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
            <label htmlFor={id('birthDay')}>일</label>
            <select
              id={id('birthDay')}
              value={draft.birthDay}
              onChange={updateField('birthDay')}
              disabled={disabled}
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
        <label htmlFor={id('birthTime')}>태어난 시간</label>
        <input
          id={id('birthTime')}
          type="time"
          value={draft.birthTime}
          onChange={updateField('birthTime')}
          disabled={disabled}
        />
      </div>

      <div className="field-row">
        <div className="field">
          <label htmlFor={id('gender')}>성별</label>
          <select
            id={id('gender')}
            value={draft.gender}
            onChange={updateField('gender')}
            disabled={disabled}
          >
            <option value="">선택하세요</option>
            <option value="male">남성</option>
            <option value="female">여성</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor={id('calendarType')}>양력 / 음력</label>
          <select
            id={id('calendarType')}
            value={draft.calendarType}
            onChange={updateField('calendarType')}
            disabled={disabled}
          >
            <option value="">선택하세요</option>
            <option value="solar">양력</option>
            <option value="lunar">음력</option>
          </select>
        </div>
      </div>
    </>
  )
}
