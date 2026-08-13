import { toPng } from 'html-to-image'

function captureBackground() {
  const theme = document.documentElement.getAttribute('data-theme')
  return theme === 'dark' ? '#0a1020' : '#f3f6fb'
}

function safeFileName(name) {
  const cleaned = String(name || 'saju')
    .replace(/[\\/:*?"<>|]/g, '')
    .trim()
  return cleaned || 'saju'
}

export async function downloadResultImage(node, name) {
  if (!node) throw new Error('결과 영역을 찾지 못했습니다.')

  await document.fonts.ready
  node.classList.add('is-capturing')

  try {
    const dataUrl = await toPng(node, {
      pixelRatio: Math.min(2, window.devicePixelRatio || 2),
      cacheBust: true,
      backgroundColor: captureBackground(),
    })

    const link = document.createElement('a')
    link.download = `사주미-${safeFileName(name)}.png`
    link.href = dataUrl
    link.click()
  } finally {
    node.classList.remove('is-capturing')
  }
}
