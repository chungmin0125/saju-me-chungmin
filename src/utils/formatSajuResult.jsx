/**
 * Gemini 답변의 마크다운 흔적(###, -, *)을
 * 화면에 쓰기 좋은 블록 구조로 바꿉니다.
 */
export function parseResultBlocks(text) {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const blocks = []
  let listItems = []

  const flushList = () => {
    if (listItems.length > 0) {
      blocks.push({ type: 'list', items: [...listItems] })
      listItems = []
    }
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushList()
      continue
    }

    // ### 제목
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/)
    if (headingMatch) {
      flushList()
      blocks.push({
        type: 'heading',
        level: Math.min(headingMatch[1].length, 3),
        text: cleanInlineMarkdown(headingMatch[2]),
      })
      continue
    }

    // - 항목 / * 항목 / • 항목 / 1. 항목
    const bulletMatch = line.match(/^[-*•]\s+(.*)$/) || line.match(/^\d+[.)]\s+(.*)$/)
    if (bulletMatch) {
      listItems.push(cleanInlineMarkdown(bulletMatch[1]))
      continue
    }

    flushList()
    blocks.push({
      type: 'paragraph',
      text: cleanInlineMarkdown(line),
    })
  }

  flushList()
  return blocks
}

/** 문장 앞에 남은 # 기호만 정리합니다. (**굵게**는 렌더 단계에서 처리) */
function cleanInlineMarkdown(text) {
  return text.replace(/^#+\s*/, '').trim()
}

/**
 * **굵게**, *기울임* 을 인식하고
 * 한자(CJK)는 따로 감싸서 크게 보여 줍니다.
 */
export function renderRichText(text) {
  // **bold** / *italic* 단위로 먼저 나눕니다.
  const tokenRegex = /(\*\*[^*]+\*\*|\*[^*]+\*)/g
  const segments = []
  let lastIndex = 0
  let match

  while ((match = tokenRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }

    const token = match[0]
    if (token.startsWith('**')) {
      segments.push({ type: 'strong', value: token.slice(2, -2) })
    } else {
      segments.push({ type: 'em', value: token.slice(1, -1) })
    }

    lastIndex = match.index + token.length
  }

  if (lastIndex < text.length) {
    segments.push({ type: 'text', value: text.slice(lastIndex) })
  }

  if (segments.length === 0) {
    segments.push({ type: 'text', value: text })
  }

  return segments.map((segment, index) => {
    const content = emphasizeHanja(segment.value)
    if (segment.type === 'strong') {
      return (
        <strong key={index} className="result-strong">
          {content}
        </strong>
      )
    }
    if (segment.type === 'em') {
      return (
        <em key={index} className="result-em">
          {content}
        </em>
      )
    }
    return <span key={index}>{content}</span>
  })
}

/** 한자만 <span class="hanja">로 감쌉니다. */
function emphasizeHanja(text) {
  const parts = text.split(/([\u4E00-\u9FFF]+)/)
  return parts.map((part, index) => {
    if (!part) return null
    if (/^[\u4E00-\u9FFF]+$/.test(part)) {
      return (
        <span key={index} className="hanja">
          {part}
        </span>
      )
    }
    return part
  })
}
