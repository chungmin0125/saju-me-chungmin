const SHARE_TOKEN_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function getSharePathInfo(pathname = window.location.pathname) {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  if (normalized === '/share') {
    return { isShare: true, token: null }
  }
  if (!normalized.startsWith('/share/')) {
    return { isShare: false, token: null }
  }
  const token = normalized.slice('/share/'.length)
  return {
    isShare: true,
    token: SHARE_TOKEN_RE.test(token) ? token : null,
  }
}

export function buildShareUrl(shareToken) {
  return `${window.location.origin}/share/${shareToken}`
}

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const el = document.createElement('textarea')
  el.value = text
  el.setAttribute('readonly', '')
  el.style.position = 'fixed'
  el.style.left = '-9999px'
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

export function readingSnapshotFromProfile(profile) {
  if (!profile) return {}
  return {
    display_name: profile.name ?? '',
    birth_date: profile.birth_date ?? '',
    birth_time: profile.birth_time ?? '',
    calendar_type: profile.calendar_type ?? '',
  }
}
