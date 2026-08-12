export const config = {
  runtime: 'edge',
}

/**
 * Vercel Edge Function
 * POST /api/saju  { "prompt": "..." }  →  { "text": "..." }
 */
export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    })
  }

  if (request.method !== 'POST') {
    return json({ error: 'POST만 허용됩니다.' }, 405)
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    return json(
      {
        error:
          '서버에 API 키가 없습니다. Vercel Environment Variables에 GEMINI_API_KEY 를 추가한 뒤 Redeploy 하세요.',
      },
      500
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return json({ error: '잘못된 JSON 본문입니다.' }, 400)
  }

  const prompt = body?.prompt
  if (!prompt || typeof prompt !== 'string') {
    return json({ error: 'prompt가 필요합니다.' }, 400)
  }

  const model = 'gemini-3.6-flash'
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`

  try {
    const geminiRes = await fetch(url, {
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

    const data = await geminiRes.json()

    if (!geminiRes.ok) {
      return json(
        {
          error: data?.error?.message || 'Gemini API 요청에 실패했습니다.',
        },
        geminiRes.status
      )
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text)
      .filter(Boolean)
      .join('\n')
      .trim()

    if (!text) {
      return json({ error: 'Gemini가 빈 답변을 반환했습니다.' }, 502)
    }

    return json({ text }, 200)
  } catch (err) {
    return json(
      {
        error: err?.message || '서버에서 Gemini 호출 중 오류가 발생했습니다.',
      },
      500
    )
  }
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  })
}
