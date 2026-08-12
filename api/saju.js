/**
 * Vercel 서버리스 함수
 * 브라우저 → /api/saju → Google Gemini
 *
 * 키는 Vercel Environment Variables에서 읽습니다.
 * (GEMINI_API_KEY 또는 VITE_GEMINI_API_KEY)
 */
export default async function handler(req, res) {
  // CORS (같은 도메인이면 사실상 필요 없지만 안전하게)
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(204).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST만 허용됩니다.' })
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    return res.status(500).json({
      error:
        '서버에 API 키가 없습니다. Vercel Environment Variables에 GEMINI_API_KEY 또는 VITE_GEMINI_API_KEY를 추가한 뒤 Redeploy 하세요.',
    })
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body
  const prompt = body?.prompt

  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'prompt가 필요합니다.' })
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
      return res.status(geminiRes.status).json({
        error: data?.error?.message || 'Gemini API 요청에 실패했습니다.',
      })
    }

    const text = data?.candidates?.[0]?.content?.parts
      ?.map((part) => part?.text)
      .filter(Boolean)
      .join('\n')
      .trim()

    if (!text) {
      return res.status(502).json({ error: 'Gemini가 빈 답변을 반환했습니다.' })
    }

    return res.status(200).json({ text })
  } catch (err) {
    return res.status(500).json({
      error: err?.message || '서버에서 Gemini 호출 중 오류가 발생했습니다.',
    })
  }
}
