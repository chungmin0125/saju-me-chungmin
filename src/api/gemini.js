/**
 * Gemini API에게 프롬프트를 보내고, 텍스트 답변을 받아오는 함수입니다.
 *
 * - 로컬(npm run dev): .env의 VITE_GEMINI_API_KEY + Vite 프록시
 * - 배포(Vercel): /api/saju 서버리스 함수가 서버에서 키를 읽어 호출
 */
async function readJsonSafe(response) {
  const raw = await response.text()
  try {
    return JSON.parse(raw)
  } catch {
    // HTML 404 페이지 등이 온 경우 (예: "The page could not be found")
    throw new Error(
      `서버가 JSON 대신 다른 응답을 반환했습니다. (/api/saju 상태: ${response.status}) 최신 코드가 Vercel에 배포됐는지 확인해 주세요.`
    )
  }
}

export async function askGemini(prompt) {
  // ----- 배포(Vercel) -----
  if (!import.meta.env.DEV) {
    let response
    try {
      response = await fetch('/api/saju', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      })
    } catch {
      throw new Error('네트워크 요청에 실패했습니다.')
    }

    const data = await readJsonSafe(response)
    if (!response.ok) {
      throw new Error(data?.error || '사주 분석 요청에 실패했습니다.')
    }
    if (!data?.text) {
      throw new Error('Gemini가 빈 답변을 반환했습니다.')
    }
    return data.text
  }

  // ----- 로컬 개발 -----
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY가 없습니다. .env 파일을 확인하고 npm run dev를 다시 시작해 주세요.'
    )
  }

  const model = 'gemini-3.6-flash'
  const url = `/api/gemini/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  let response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      '네트워크 요청에 실패했습니다. npm run dev를 재시작한 뒤 다시 시도해 주세요.'
    )
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
