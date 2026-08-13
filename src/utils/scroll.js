export function scrollToResult() {
  requestAnimationFrame(() => {
    document.getElementById('saju-result')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    })
  })
}
