import { useEffect, useState } from 'react'

export type Route =
  | { name: 'home' }
  | { name: 'search' }
  | { name: 'settings' }
  | { name: 'set'; setNum: string }

function parse(hash: string): Route {
  const path = hash.replace(/^#/, '') || '/'
  const m = path.match(/^\/set\/(.+)$/)
  if (m) return { name: 'set', setNum: decodeURIComponent(m[1]) }
  if (path === '/search') return { name: 'search' }
  if (path === '/settings') return { name: 'settings' }
  return { name: 'home' }
}

export function useRoute() {
  const [route, setRoute] = useState(() => parse(location.hash))
  useEffect(() => {
    const on = () => {
      setRoute(parse(location.hash))
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])
  return route
}

export const go = (path: string) => {
  location.hash = path
}
export const setHref = (setNum: string) => `#/set/${encodeURIComponent(setNum)}`
