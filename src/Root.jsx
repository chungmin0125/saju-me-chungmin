import App from './App.jsx'
import ShareView from './components/share/ShareView.jsx'
import { getSharePathInfo } from './utils/share'

export default function Root() {
  const { isShare, token } = getSharePathInfo()
  if (isShare) return <ShareView shareToken={token} />
  return <App />
}
