import { useEffect, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { fetchSet, searchSets, type RbSet } from '../api/rebrickable'
import { db, saveSet } from '../db'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { go, setHref } from '../router'
import { t, useLang } from '../i18n'

export function Search() {
  useLang()
  const [q, setQ] = useState('')
  const [results, setResults] = useState<RbSet[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ setNum: string; msg: string } | null>(null)
  const mine = useLiveQuery(async () => new Set(await db.sets.toCollection().primaryKeys()), [])
  const reqId = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  useEffect(() => {
    const term = q.trim()
    if (term.length < 2) {
      setResults(null)
      return
    }
    const id = ++reqId.current
    const t = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await searchSets(term)
        if (id === reqId.current) setResults(r)
      } catch (e) {
        if (id === reqId.current) setError((e as Error).message)
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    }, 450)
    return () => clearTimeout(t)
  }, [q])

  async function add(s: RbSet) {
    if (mine?.has(s.set_num)) return go(setHref(s.set_num))
    setAdding({ setNum: s.set_num, msg: t('search.starting') })
    setError(null)
    try {
      const { set, parts } = await fetchSet(s.set_num, (msg) => setAdding({ setNum: s.set_num, msg }))
      await saveSet(set, parts)
      go(setHref(set.setNum))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAdding(null)
    }
  }

  return (
    <>
      <Header title={t('search.title')} back="#/" />
      <main className="page">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            placeholder={t('search.placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {loading && <span className="spinner" />}
        </label>
        {error && <p className="error">{error}</p>}
        {results && results.length === 0 && !loading && <p className="muted center">{t('search.noHits')}</p>}
        <div className="result-list">
          {results?.map((s) => {
            const owned = mine?.has(s.set_num)
            const busy = adding?.setNum === s.set_num
            return (
              <button key={s.set_num} className="result" onClick={() => add(s)} disabled={!!adding}>
                <div className="set-thumb">{s.set_img_url && <img src={s.set_img_url} alt="" loading="lazy" />}</div>
                <div className="set-info">
                  <strong className="clamp">{s.name}</strong>
                  <span className="muted small">
                    {s.set_num} · {s.year} · {t('search.parts', { n: s.num_parts })}
                  </span>
                  {busy && <span className="small accent">{adding?.msg}</span>}
                </div>
                <span className={owned ? 'pill' : 'pill add'}>{busy ? <span className="spinner" /> : owned ? t('search.open') : t('search.add')}</span>
              </button>
            )
          })}
        </div>
      </main>
    </>
  )
}
