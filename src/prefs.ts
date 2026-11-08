import { useState } from 'react'

export function usePref<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem('bs.' + key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })
  const set = (v: T) => {
    setValue(v)
    try {
      localStorage.setItem('bs.' + key, JSON.stringify(v))
    } catch {
      /* ignore */
    }
  }
  return [value, set] as const
}
