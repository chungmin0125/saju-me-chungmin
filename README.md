# 사주미 (saju-me-chungmin)

부트캠프 두 번째 프로젝트 — React로 만든 사주 기본 해석 웹앱입니다.

배포: [https://saju-me-chungmin.vercel.app/](https://saju-me-chungmin.vercel.app/)

Google 로그인 후 출생 정보를 한 번만 저장하면, 다음부터는 바로 Gemini API로 성격·기질·재능을 해석해 보여 드립니다.

## 주요 기능

- Google 로그인 (계정별로 프로필·사주 기록 분리)
- 첫 로그인 시 출생 정보 온보딩 모달 (이름, 생년월일, 태어난 시간, 성별, 양력/음력)
- 프로필에서 정보 수정, 저장된 정보로 바로 사주 보기
- Gemini API를 통한 사주 기본 차트 해석
  - 모델 과부하 시 재시도 후 `gemini-3.5-flash` / `gemini-2.5-flash`로 전환
- 사주 기록 저장·불러오기·삭제 (사이드바)
- 달토끼 마스코트 **미**
- 울산중구체 제목/결과 폰트
- 다크 모드 / 라이트 모드 전환 (선택값 브라우저에 저장)
- 분석 중 로딩 오버레이
- 결과 텍스트 정리 (`###` 제목, 글머리 기호, 한자 강조)
- `.env`의 API 키는 git에 포함되지 않음

## 데이터베이스

Supabase Postgres, RLS로 본인 행만 읽고 씁니다.

| 테이블 | 역할 |
| --- | --- |
| `users` | 로그인 유저 프로필 (이름, 생년월일, 태어난 시간, 성별, 양력/음력) |
| `saju_readings` | 사주 해석 결과. `user_id`로 `users`와 연결 |

## 시작하기

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:5173` 을 엽니다.

### API 키 설정

#### 로컬

프로젝트 루트에 `.env` 파일을 만들고 아래처럼 작성합니다.

```env
VITE_GEMINI_API_KEY=여기에_발급한_키
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=여기에_publishable_키
```

`.env`를 수정한 뒤에는 `npm run dev`를 **다시 시작**해야 합니다.

#### Netlify / Vercel 배포

1. Environment Variables에 **이름 정확히** 추가 (Production 체크):
   - `VITE_GEMINI_API_KEY` = AI Studio 키
   - `VITE_SUPABASE_URL` = `https://qbxgoqktkmcwbylkeolh.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = Supabase publishable/anon 키
   - (또는 `GEMINI_API_KEY` 도 가능)
2. **반드시 Redeploy** (환경 변수는 빌드 시점에 들어갑니다. 저장만 하면 배포 사이트는 그대로입니다.)
   - Vercel: Deployments → ⋯ → Redeploy → **Use existing Build Cache** 끄고 재배포 권장
3. Build command: `npm run build` / Output: `dist`

**Vercel에서 "Supabase 환경 변수가 없습니다"가 나올 때**

- Settings → Environment Variables 목록에 위 3개 **이름이** 있는지 확인
- 값이 안 보여도 정상일 수 있음 (보안상 마스킹). 이름이 없으면 다시 추가
- 추가/수정 후 **Redeploy** 하지 않으면 반영 안 됨
- Preview와 Production을 구분해 넣었다면, 지금 보는 도메인에 맞는 Environment에 넣었는지 확인

**Netlify만 안 될 때 (중요)**  
Site configuration → Environment variables → `VITE_GEMINI_API_KEY` 편집에서  
**Scopes에 `Builds`가 체크**되어 있는지 확인하세요.  
`Runtime`만 켜져 있으면 Vite 빌드에 키가 안 들어가서 이 오류가 납니다.  
수정 후 **Clear cache and deploy** 하세요.

> `npm run dev`는 로컬 전용입니다. 배포 사이트에서는 쓰지 않습니다.  
> 로컬에서 이 메시지가 나오면: `.env` 확인 → 터미널에서 서버 종료(`Ctrl+C`) → `npm run dev` 다시 실행.

## 기술 스택

- React + Vite
- Supabase (Auth, Postgres, RLS)
- Gemini API (`generateContent`, Vite 개발 서버 프록시)
- CSS 변수 기반 테마 (라이트/다크)
- 울산중구체 (`src/assets/fonts/ulsanjunggu.ttf`)

## 폴더 구조 (주요)

```
src/
  App.jsx                      # 메인 화면
  App.css                      # 스타일 / 테마 / 애니메이션
  api/gemini.js                # Gemini API 호출 (모델 폴백 포함)
  components/Mascot.jsx        # 달토끼 미
  components/ProfileModal.jsx  # 온보딩·프로필 수정
  prompts/buildSajuPrompt.js   # 사주 해석 프롬프트
  utils/formatSajuResult.jsx   # 결과 텍스트 포맷팅
  utils/profile.js             # 프로필 필드·검증
  assets/fonts/                # 울산중구체
  assets/mascot-mi.webp        # 마스코트 이미지
```
