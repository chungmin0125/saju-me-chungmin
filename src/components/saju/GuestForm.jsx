import SajuFields from './SajuFields'

export default function GuestForm({
  draft,
  onChange,
  missingHint,
  isReady,
  isLoading,
  onAnalyze,
}) {
  return (
    <section className="form-section" aria-label="사주 입력">
      <p className="guest-hint">
        로그인 없이 먼저 사주를 볼 수 있어요. 전체 해석과 저장은 Google 로그인 후 열려요.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!isLoading && isReady) onAnalyze()
        }}
      >
        <SajuFields
          idPrefix="guest"
          draft={draft}
          onChange={onChange}
          disabled={isLoading}
        />
        {!isReady && <p className="form-hint">{missingHint}</p>}
        <div className="form-actions">
          <button
            type="submit"
            className="analyze-btn"
            disabled={isLoading || !isReady}
          >
            사주 보기
          </button>
        </div>
      </form>
    </section>
  )
}
