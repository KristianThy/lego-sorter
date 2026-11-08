import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, setFound, type LegoSet, type Part } from '../db'
import { lookupElement } from '../api/rebrickable'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { PartRow } from '../components/PartRow'
import { partMatches, progressMap } from '../stats'
import { setHref } from '../router'
import { usePref } from '../prefs'
import { t, useLang } from '../i18n'

const MAX_ROWS = 200

interface Element {
  id: string
  partNum: string
  colorId: number
  colorName: string
}

interface Hit {
  part: Part
  /** Matched an id exactly (part number, BrickLink id, element id) rather than by text. */
  exact: boolean
}

interface SetHits {
  set: LegoSet
  hits: Hit[]
  left: number
  exact: boolean
}

/** Find which of your saved sets a part belongs to. Searches locally; only unknown element ids go to the API. */
export function FindPart() {
  useLang()
  const [q, setQ] = useState('')
  const [term, setTerm] = useState('')
  const [missingOnly, setMissingOnly] = usePref('findMissingOnly', true)
  const [element, setElement] = useState<Element | null>(null)
  const [looking, setLooking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Parts completed here stay visible until the search changes, so a tap doesn't make the row vanish.
  const [sticky, setSticky] = useState<Set<string>>(() => new Set())
  const elementCache = useRef(new Map<string, Element | null>())
  const inputRef = useRef<HTMLInputElement>(null)

  const parts = useLiveQuery(() => db.parts.toArray(), [])
  const progRows = useLiveQuery(() => db.progress.toArray(), [])
  const sets = useLiveQuery(() => db.sets.toArray(), [])
  const prog = useMemo(() => progressMap(progRows ?? []), [progRows])
  const setsByNum = useMemo(() => new Map((sets ?? []).map((s) => [s.setNum, s])), [sets])

  useEffect(() => inputRef.current?.focus(), [])

  useEffect(() => {
    const timer = setTimeout(() => setTerm(q.trim().toLowerCase()), 200)
    return () => clearTimeout(timer)
  }, [q])

  useEffect(() => setSticky(new Set()), [term])

  const isElementId = /^\d{6,8}$/.test(term)
  const elementIsLocal = useMemo(
    () => (parts && isElementId ? parts.some((p) => p.elementId === term) : undefined),
    [parts, term, isElementId],
  )

  // A number that looks like an element id but isn't in any saved set: ask Rebrickable which part + colour it is.
  useEffect(() => {
    setElement(null)
    setError(null)
    if (elementIsLocal !== false) return
    const cached = elementCache.current.get(term)
    if (cached !== undefined) return setElement(cached)
    let cancelled = false
    setLooking(true)
    lookupElement(term)
      .then((el) => {
        const found = el && { id: term, ...el }
        elementCache.current.set(term, found)
        if (!cancelled) setElement(found)
      })
      .catch((e) => !cancelled && setError((e as Error).message))
      .finally(() => !cancelled && setLooking(false))
    return () => {
      cancelled = true
      setLooking(false)
    }
  }, [term, elementIsLocal])

  const groups = useMemo((): { list: SetHits[]; total: number } | null => {
    if (!parts || term.length < 2) return null
    const bySet = new Map<string, SetHits>()
    let total = 0
    for (const p of parts) {
      if (p.isSpare) continue
      const f = prog.get(p.key) ?? 0
      if (missingOnly && f >= p.qty && !sticky.has(p.key)) continue
      const exact =
        p.partNum.toLowerCase() === term ||
        p.blPartId?.toLowerCase() === term ||
        p.elementId === term ||
        (!!element && p.partNum === element.partNum && p.colorId === element.colorId)
      if (!exact && !partMatches(p, term)) continue
      const set = setsByNum.get(p.setNum)
      if (!set) continue
      let g = bySet.get(p.setNum)
      if (!g) bySet.set(p.setNum, (g = { set, hits: [], left: 0, exact: false }))
      g.hits.push({ part: p, exact })
      g.left += Math.max(0, p.qty - f)
      g.exact ||= exact
      total++
    }
    const list = [...bySet.values()]
    for (const g of list) g.hits.sort((a, b) => Number(b.exact) - Number(a.exact) || a.part.name.localeCompare(b.part.name))
    list.sort((a, b) => Number(b.exact) - Number(a.exact) || b.left - a.left || a.set.name.localeCompare(b.set.name))
    return { list, total }
  }, [parts, prog, setsByNum, term, element, missingOnly, sticky])

  // Cap the number of rows rendered; short searches like "2x" can match thousands.
  const shown = useMemo(() => {
    if (!groups) return []
    let budget = MAX_ROWS
    const out: SetHits[] = []
    for (const g of groups.list) {
      if (budget <= 0) break
      out.push(budget >= g.hits.length ? g : { ...g, hits: g.hits.slice(0, budget) })
      budget -= g.hits.length
    }
    return out
  }, [groups])

  const onSet = useCallback((part: Part, found: number) => {
    if (found >= part.qty) setSticky((s) => new Set(s).add(part.key))
    void setFound(part, found)
  }, [])

  return (
    <>
      <Header title={t('find.title')} back="#/" />
      <main className="page">
        <label className="search-field">
          <Icon name="search" size={18} />
          <input
            ref={inputRef}
            type="search"
            inputMode="search"
            placeholder={t('find.placeholder')}
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {looking && <span className="spinner" />}
        </label>
        <label className="toggle multi-toggle">
          <input type="checkbox" checked={missingOnly} onChange={(e) => setMissingOnly(e.target.checked)} />
          {t('find.missingOnly')}
        </label>
        {error && <p className="error">{error}</p>}
        {element && (
          <p className="notice find-element">
            {t('find.element', { id: element.id, part: element.partNum, color: element.colorName })}
          </p>
        )}
        {!groups && <p className="muted center">{t('find.hint')}</p>}
        {groups && groups.total === 0 && !looking && <p className="muted center">{t('find.noHits')}</p>}
        {shown.map((g) => (
          <section key={g.set.setNum} className="group">
            <a className="find-set-head" href={setHref(g.set.setNum)}>
              <div className="set-thumb sm">{g.set.imgUrl && <img src={g.set.imgUrl} alt="" loading="lazy" />}</div>
              <div className="set-info">
                <strong className="clamp">{g.set.name}</strong>
                <span className="muted small">
                  {g.set.setNum} · {t('set.groupLeft', { n: g.left })}
                </span>
              </div>
              <Icon name="next" size={18} />
            </a>
            <div className="part-list">
              {g.hits.map(({ part }) => (
                <PartRow key={part.key} part={part} found={prog.get(part.key) ?? 0} onSet={onSet} />
              ))}
            </div>
          </section>
        ))}
        {groups && groups.total > MAX_ROWS && (
          <p className="muted small center find-more">{t('find.tooMany', { n: MAX_ROWS, total: groups.total })}</p>
        )}
      </main>
    </>
  )
}
