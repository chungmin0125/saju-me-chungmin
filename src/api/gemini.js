/**
 * Gemini API에게 프롬프트를 보내고, 텍스트 답변을 받아오는 함수입니다.
 *
 * - 로컬(npm run dev): Vite 프록시(/api/gemini) 사용
 * - 배포(Netlify / Vercel 등): Google API에 직접 요청
 *
 * 배포 사이트 Environment Variables에
 * VITE_GEMINI_API_KEY 를 넣고 **다시 빌드/배포** 해야 합니다.
 */
import { publicEnv } from '../config/publicEnv'

const MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-2.5-flash']

const CAPACITY_MESSAGE =
  '지금 사주 분석 서버가 많이 몰려 있습니다. 잠시 후 다시 시도해 주세요.'

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function isCapacityError(status, message) {
  const text = String(message || '').toLowerCase()
  return (
    status === 429 ||
    status === 503 ||
    text.includes('high demand') ||
    text.includes('overloaded') ||
    text.includes('unavailable') ||
    text.includes('try again later') ||
    text.includes('resource exhausted') ||
    text.includes('capacity')
  )
}

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

function extractText(data) {
  return data?.candidates?.[0]?.content?.parts
    ?.map((part) => part?.text)
    .filter(Boolean)
    .join('\n')
    .trim()
}

function requestUrl(model, apiKey) {
  return import.meta.env.DEV
    ? `/api/gemini/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
    : `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`
}

async function generateOnce(model, prompt, apiKey) {
  let response
  try {
    response = await fetch(requestUrl(model, apiKey), {
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
  return { response, data }
}

export async function askGemini(prompt) {
  const apiKey = publicEnv.geminiApiKey

  if (!apiKey) {
    throw new Error(
      'VITE_GEMINI_API_KEY가 없습니다. 로컬은 .env + npm run dev 재시작, 배포는 Vercel Environment Variables에 키를 넣고 다시 배포해 주세요.'
    )
  }

  let lastCapacityError = false

  for (const model of MODELS) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const { response, data } = await generateOnce(model, prompt, apiKey)

      if (response.ok) {
        const text = extractText(data)
        if (!text) {
          throw new Error('Gemini가 빈 답변을 반환했습니다.')
        }
        return text
      }

      const message = data?.error?.message || 'Gemini API 요청에 실패했습니다.'

      if (isCapacityError(response.status, message)) {
        lastCapacityError = true
        if (attempt === 0) {
          await sleep(700 + Math.random() * 500)
          continue
        }
        break
      }

      throw new Error(message)
    }
  }

  throw new Error(
    lastCapacityError ? CAPACITY_MESSAGE : 'Gemini API 요청에 실패했습니다.'
  )
}
