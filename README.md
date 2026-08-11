# 사주미 (saju-me-chungmin)

부트캠프 두 번째 프로젝트 — React로 만든 사주 기본 해석 웹앱입니다.

출생 정보를 입력하면 Gemini API로 성격·기질·재능을 해석해 보여 줍니다.

## 주요 기능

- 이름, 생년월일(연/월/일), 태어난 시간, 성별, 양력/음력 입력
- Gemini API를 통한 사주 기본 차트 해석
- 다크 모드 / 라이트 모드 전환 (선택값 브라우저에 저장)
- 분석 중 로딩 오버레이 (점 애니메이션)
- 몽환적인 배경과 결과 화면 UI
- 결과 텍스트 정리
  - `###` 제목, `*`/`-` 글머리 기호로 변환
  - 한자(CJK) 강조 표시
- `.env`의 API 키는 git에 포함되지 않음

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

### API 키 설정

프로젝트 루트에 `.env` 파일을 만들고 아래처럼 작성합니다.

```env
VITE_GEMINI_API_KEY=여기에_발급한_키
```

키는 [Google AI Studio](https://aistudio.google.com/apikey)에서 발급할 수 있습니다.  
`.env`를 수정한 뒤에는 개발 서버를 다시 시작해야 합니다.

## 기술 스택

- React + Vite
- Gemini API (`generateContent`, Vite 개발 서버 프록시)
- CSS 변수 기반 테마 (라이트/다크)

## 폴더 구조 (주요)

```
src/
  App.jsx                 # 메인 화면
  App.css                 # 스타일 / 테마 / 애니메이션
  api/gemini.js           # Gemini API 호출
  prompts/buildSajuPrompt.js  # 사주 해석 프롬프트
  utils/formatSajuResult.jsx  # 결과 텍스트 포맷팅
```
