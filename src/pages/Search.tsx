import { useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  fetchSet,
  getThemes,
  hasFilters,
  searchSets,
  searchSetsMore,
  themePath,
  type RbSet,
  type SetFilters,
  type SetSearchPage,
  type Themes,
} from '../api/rebrickable'
import { db, getMeta, saveSet } from '../db'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { ThemePicker } from '../components/ThemePicker'
import { go, setHref } from '../router'
import { t, useLang } from '../i18n'
import { usePref } from '../prefs'

/** A four-digit year, or undefined while the field is empty or half typed. */
const parseYear = (s: string) => (/^\d{4}$/.test(s.trim()) ? Number(s.trim()) : undefined)

export function Search() {
  useLang()
  const [q, setQ] = useState('')
  const [themeId, setThemeId] = useState<number | null>(null)
  const [minYearRaw, setMinYearRaw] = useState('')
  const [maxYearRaw, setMaxYearRaw] = useState('')
  const [page, setPage] = useState<SetSearchPage | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adding, setAdding] = useState<{ setNum: string; msg: string } | null>(null)
  const [multi, setMulti] = usePref('searchMultiAdd', false)
  const mine = useLiveQuery(async () => new Set(await db.sets.toCollection().primaryKeys()), [])
  const themes = useLiveQuery(async () => (await getMeta<Themes>('themes')) ?? null, [])
  const reqId = useRef(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => inputRef.current?.focus(), [])

  const minYear = parseYear(minYearRaw)
  const maxYear = parseYear(maxYearRaw)
  const filters: SetFilters = useMemo(
    () => ({ themeId: themeId ?? undefined, minYear, maxYear }),
    [themeId, minYear, maxYear],
  )
  const filtered = hasFilters(filters)

  // Theme names for the picker and the result rows. Refetch once if a result has an unknown theme.
  const themeFetchTried = useRef(false)
  useEffect(() => {
    if (themes === undefined || themeFetchTried.current) return
    const missing = themes === null || !!page?.results.some((s) => !themes[s.theme_id])
    if (!missing) return
    themeFetchTried.current = true
    void getThemes(themes !== null).catch(() => undefined)
  }, [themes, page])

  useEffect(() => {
    const term = q.trim()
    const id = ++reqId.current
    setLoadingMore(false)
    if (term.length < 2 && !filtered) {
      setPage(null)
      setLoading(false)
      return
    }
    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const r = await searchSets(term.length >= 2 ? term : '', filters)
        if (id === reqId.current) setPage(r)
      } catch (e) {
        if (id === reqId.current) setError((e as Error).message)
      } finally {
        if (id === reqId.current) setLoading(false)
      }
    }, 450)
    return () => clearTimeout(timer)
  }, [q, filters, filtered])

  async function loadMore() {
    if (!page?.next) return
    const id = reqId.current
    setLoadingMore(true)
    setError(null)
    try {
      const more = await searchSetsMore(page.next)
      if (id !== reqId.current) return
      setPage((prev) => {
        if (!prev) return prev
        const seen = new Set(prev.results.map((s) => s.set_num))
        return { ...more, results: [...prev.results, ...more.results.filter((s) => !seen.has(s.set_num))] }
      })
    } catch (e) {
      if (id === reqId.current) setError((e as Error).message)
    } finally {
      if (id === reqId.current) setLoadingMore(false)
    }
  }

  function clearFilters() {
    setThemeId(null)
    setMinYearRaw('')
    setMaxYearRaw('')
  }

  async function add(s: RbSet) {
    if (mine?.has(s.set_num)) return go(setHref(s.set_num))
    setAdding({ setNum: s.set_num, msg: t('search.starting') })
    setError(null)
    try {
      const { set, parts } = await fetchSet(s.set_num, (msg) => setAdding({ setNum: s.set_num, msg }))
      await saveSet(set, parts)
      // In multi-add mode stay on the search page so more sets can be added.
      if (!multi) go(setHref(set.setNum))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setAdding(null)
    }
  }

  const results = page?.results
  const themeLabel = (s: RbSet) => (themes ? themePath(themes, s.theme_id).map((p) => p.name).join(' › ') : '')

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
        <div className="options-row search-filters">
          <div className="select theme-filter">
            <span className="muted" aria-hidden>
              {t('search.theme')}
            </span>
            <ThemePicker themes={themes} value={themeId} onChange={setThemeId} />
          </div>
          <span className="select">
            <span className="muted">{t('search.year')}</span>
            <input
              className="year-input"
              type="number"
              inputMode="numeric"
              min={1949}
              max={2100}
              placeholder={t('search.yearFrom')}
              aria-label={`${t('search.year')} ${t('search.yearFrom')}`}
              value={minYearRaw}
              onChange={(e) => setMinYearRaw(e.target.value)}
            />
            –
            <input
              className="year-input"
              type="number"
              inputMode="numeric"
              min={1949}
              max={2100}
              placeholder={t('search.yearTo')}
              aria-label={`${t('search.year')} ${t('search.yearTo')}`}
              value={maxYearRaw}
              onChange={(e) => setMaxYearRaw(e.target.value)}
            />
          </span>
          {(themeId != null || minYearRaw || maxYearRaw) && (
            <button className="link-btn" onClick={clearFilters}>
              {t('search.clearFilters')}
            </button>
          )}
        </div>
        <label className="toggle multi-toggle" title={t('search.multiHint')}>
          <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
          {t('search.multi')}
        </label>
        {error && <p className="error">{error}</p>}
        {results && results.length === 0 && !loading && <p className="muted center">{t('search.noHits')}</p>}
        {page && page.results.length > 0 && <p className="muted small result-count">{t('search.count', { n: page.count })}</p>}
        <div className="result-list">
          {results?.map((s) => {
            const owned = mine?.has(s.set_num)
            const busy = adding?.setNum === s.set_num
            const theme = themeLabel(s)
            return (
              <button key={s.set_num} className="result" onClick={() => add(s)} disabled={!!adding}>
                <div className="set-thumb">{s.set_img_url && <img src={s.set_img_url} alt="" loading="lazy" />}</div>
                <div className="set-info">
                  <strong className="clamp">{s.name}</strong>
                  <span className="muted small">
                    {s.set_num} · {s.year} · {t('search.parts', { n: s.num_parts })}
                  </span>
                  {theme && <span className="muted small one-line">{theme}</span>}
                  {busy && <span className="small accent">{adding?.msg}</span>}
                </div>
                <span className={owned ? 'pill' : 'pill add'}>{busy ? <span className="spinner" /> : owned ? t('search.open') : t('search.add')}</span>
              </button>
            )
          })}
        </div>
        {page?.next && (
          <div className="center more-row">
            <button className="btn" onClick={loadMore} disabled={loadingMore}>
              {loadingMore ? <span className="spinner" /> : t('search.more')}
            </button>
          </div>
        )}
      </main>
    </>
  )
}
