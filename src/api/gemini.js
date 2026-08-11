/**
 * Gemini API에게 프롬프트를 보내고, 텍스트 답변을 받아오는 함수입니다.
 *
 * API란? 우리 앱이 구글 Gemini 서버에게
 * "이 질문 좀 답해줘"라고 요청하고, 결과를 돌려받는 통로입니다.
 *
 * 브라우저는 Google에 직접 요청하지 않고,
 * Vite 개발 서버 프록시(/api/gemini)를 거쳐 요청합니다. (CORS 우회)
 */
export async function askGemini(prompt) {
  // Vite는 .env에 적은 VITE_ 로 시작하는 값만 프론트에서 읽을 수 있습니다.
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY가 없습니다. .env 파일을 확인하고 개발 서버를 다시 시작해 주세요.'
    )
  }

  // 신규 사용자용 최신 Flash 모델
  const model = 'gemini-3.6-flash'

  // generateContent API (Interactions보다 프로젝트 제한이 적은 편)
  // 프록시를 통해: /api/gemini → https://generativelanguage.googleapis.com
  const url = `/api/gemini/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

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
    throw new Error(
      '네트워크 요청에 실패했습니다. npm run dev 를 재시작한 뒤 다시 시도해 주세요.'
    )
  }

  const data = await response.json()

  if (!response.ok) {
    const message = data?.error?.message || 'Gemini API 요청에 실패했습니다.'
    throw new Error(message)
  }

  // generateContent 응답: candidates[0].content.parts[0].text
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
