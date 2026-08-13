import App from './App.jsx'
import ShareView from './components/ShareView.jsx'
import { getSharePathInfo } from './utils/share'

export default function Root() {
  const { isShare, token } = getSharePathInfo()
  if (isShare) return <ShareView shareToken={token} />
  return <App />
}
