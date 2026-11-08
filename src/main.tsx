import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { getApiKey } from './api/rebrickable'
import { useRoute } from './router'
import { usePref } from './prefs'
import { MySets } from './pages/MySets'
import { Search } from './pages/Search'
import { SetDetail } from './pages/SetDetail'
import { Settings, type Theme } from './pages/Settings'
import './styles.css'

registerSW({ immediate: true })

// Ask the browser not to evict our IndexedDB data under storage pressure.
void navigator.storage?.persist?.().catch(() => undefined)

function App() {
  const route = useRoute()
  const [theme, setTheme] = usePref<Theme>('theme', 'auto')
  const [hasKey, setHasKey] = useState<boolean | null>(null)

  const checkKey = () => void getApiKey().then((k) => setHasKey(!!k))
  useEffect(checkKey, [])

  useEffect(() => {
    if (theme === 'auto') document.documentElement.removeAttribute('data-theme')
    else document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  if (hasKey === null) return null
  switch (route.name) {
    case 'search':
      return <Search />
    case 'settings':
      return <Settings theme={theme} setTheme={setTheme} onKeyChange={checkKey} />
    case 'set':
      return <SetDetail key={route.setNum} setNum={route.setNum} />
    default:
      return <MySets hasKey={hasKey} />
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
