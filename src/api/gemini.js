/**
 * Gemini API에게 프롬프트를 보내고, 텍스트 답변을 받아오는 함수입니다.
 *
 * - 로컬(npm run dev): Vite 프록시(/api/gemini) 사용
 * - 배포(Netlify / Vercel 등): Google API에 직접 요청
 *   → 플랫폼별 서버리스 함수 없이 동작합니다.
 *
 * 배포 사이트 Environment Variables에
 * VITE_GEMINI_API_KEY 를 넣고 **다시 빌드/배포** 해야 합니다.
 */
import { publicEnv } from '../config/publicEnv'

async function readJsonSafe(response) {
  const raw = await response.text()
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(
      `API 응답을 읽지 못했습니다. (상태: ${response.status}) VITE_GEMINI_API_KEY가 배포 환경에 설정됐는지 확인해 주세요.`
    )
  }
}

export async function askGemini(prompt) {
  const apiKey = publicEnv.geminiApiKey

  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY가 없습니다. 로컬은 .env + npm run dev 재시작, 배포는 Vercel Environment Variables에 키를 넣고 다시 배포해 주세요.'
    )
  }

  const model = 'gemini-3.6-flash'

  // 로컬만 프록시, 배포(Netlify/Vercel)는 Google 직접 호출
  const url = import.meta.env.DEV
    ? `/api/gemini/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: prompt }],
          },
        ],
      }),
    })
  } catch {
    throw new Error('네트워크 요청에 실패했습니다. 인터넷 연결을 확인해 주세요.')
  }

  const data = await readJsonSafe(response)

  if (!response.ok) {
    const message = data?.error?.message || 'Gemini API 요청에 실패했습니다.'
    throw new Error(message)
  }

  const text = data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text)
    .filter(Boolean)
    .join('\n')
    .trim()

  if (!text) {
    throw new Error('Gemini가 빈 답변을 반환했습니다.')
  }

  return text
}
