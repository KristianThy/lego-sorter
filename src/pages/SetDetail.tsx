import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteSet, getMeta, resetProgress, saveSet, setFound, touchSet, type Part } from '../db'
import { fetchSet, getCategories } from '../api/rebrickable'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { ColorDot } from '../components/ColorDot'
import { ChipScroller } from '../components/ChipScroller'
import { PartRow } from '../components/PartRow'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { computeStats, progressMap } from '../stats'
import { go } from '../router'
import { usePref } from '../prefs'
import { t, useLang } from '../i18n'

type Status = 'left' | 'found' | 'all'
type GroupBy = 'color' | 'category' | 'source' | 'none'

const STATUSES: Status[] = ['left', 'found', 'all']
const GROUP_BYS: GroupBy[] = ['color', 'category', 'source', 'none']

export function SetDetail({ setNum }: { setNum: string }) {
  const lang = useLang()
  const set = useLiveQuery(async () => (await db.sets.get(setNum)) ?? null, [setNum])
  const parts = useLiveQuery(() => db.parts.where('setNum').equals(setNum).toArray(), [setNum])
  const progRows = useLiveQuery(() => db.progress.where('setNum').equals(setNum).toArray(), [setNum])
  const categories = useLiveQuery(async () => (await getMeta<Record<number, string>>('categories')) ?? null, [])

  const [status, setStatus] = usePref<Status>('status', 'left')
  const [groupBy, setGroupBy] = usePref<GroupBy>('groupBy', 'color')
  const [showSpares, setShowSpares] = usePref('showSpares', true)
  const [collapsedList, setCollapsedList] = usePref<string[]>(`collapsed.${setNum}`, [])
  const collapsed = useMemo(() => new Set(collapsedList), [collapsedList])
  const toggleGroup = (key: string) =>
    setCollapsedList(collapsed.has(key) ? collapsedList.filter((k) => k !== key) : [...collapsedList, key])
  const [color, setColor] = useState<number | null>(null)
  const [cat, setCat] = useState<number | null>(null)
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(false)
  const [ask, setAsk] = useState<'reset' | 'delete' | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Rows completed while viewing stay visible (dimmed) until a filter changes,
  // so you can see what you just ticked off and undo it.
  const [sticky, setSticky] = useState<Set<string>>(new Set())
  const stickyRef = useRef(sticky)
  stickyRef.current = sticky

  useEffect(() => {
    void touchSet(setNum)
  }, [setNum])
  useEffect(() => {
    if (categories === null) void getCategories().catch(() => undefined)
  }, [categories])
  useEffect(() => setSticky(new Set()), [status, color, cat, q, groupBy, showSpares])

  const prog = useMemo(() => progressMap(progRows ?? []), [progRows])
  const stats = useMemo(() => computeStats(parts ?? [], prog), [parts, prog])

  const onSet = useCallback((part: Part, found: number) => {
    if (found >= part.qty && !stickyRef.current.has(part.key)) setSticky((s) => new Set(s).add(part.key))
    void setFound(part, found)
  }, [])

  const catName = useCallback((id: number) => categories?.[id] ?? t('set.categoryN', { id }), [categories, lang])

  // List after status / spare / search filters (before colour and category filters)
  const base = useMemo(() => {
    if (!parts) return []
    const term = q.trim().toLowerCase()
    return parts.filter((p) => {
      if (!showSpares && p.isSpare) return false
      const f = prog.get(p.key) ?? 0
      const done = f >= p.qty
      if (status === 'left' && done && !sticky.has(p.key)) return false
      if (status === 'found' && f === 0) return false
      if (term) {
        const hay = `${p.name} ${p.partNum} ${p.colorName} ${p.elementId ?? ''} ${p.blPartId ?? ''} ${p.sourceName ?? ''}`.toLowerCase()
        if (!hay.includes(term)) return false
      }
      return true
    })
  }, [parts, prog, status, showSpares, q, sticky])

  const colorChips = useMemo(() => {
    const m = new Map<number, { id: number; name: string; rgb: string; trans: boolean; n: number }>()
    for (const p of base) {
      if (cat != null && p.catId !== cat) continue
      const c = m.get(p.colorId) ?? { id: p.colorId, name: p.colorName, rgb: p.rgb, trans: p.isTrans, n: 0 }
      const f = prog.get(p.key) ?? 0
      if (!p.isSpare) c.n += status === 'found' ? f : status === 'left' ? Math.max(0, p.qty - f) : p.qty
      m.set(p.colorId, c)
    }
    return [...m.values()].sort((a, b) => b.n - a.n || a.name.localeCompare(b.name))
  }, [base, cat, prog, status])

  const catOptions = useMemo(() => {
    const m = new Map<number, number>()
    for (const p of base) if (color == null || p.colorId === color) m.set(p.catId, (m.get(p.catId) ?? 0) + 1)
    return [...m.entries()].map(([id, n]) => ({ id, n, name: catName(id) })).sort((a, b) => a.name.localeCompare(b.name))
  }, [base, color, catName])

  const groups = useMemo(() => {
    const list = base.filter((p) => (color == null || p.colorId === color) && (cat == null || p.catId === cat))
    const sorted = [...list].sort(
      (a, b) =>
        a.colorName.localeCompare(b.colorName) ||
        catName(a.catId).localeCompare(catName(b.catId)) ||
        a.name.localeCompare(b.name) ||
        Number(a.isSpare) - Number(b.isSpare),
    )
    const keyOf = (p: Part): [string, string] => {
      switch (groupBy) {
        case 'color':
          return [`c${p.colorId}`, p.colorName]
        case 'category':
          return [`k${p.catId}`, catName(p.catId)]
        case 'source':
          return [p.source, p.source === 'set' ? t('set.theSet') : t('set.minifig', { name: p.sourceName ?? p.source })]
        default:
          return ['all', '']
      }
    }
    const map = new Map<string, { key: string; label: string; parts: Part[]; rgb?: string; trans?: boolean }>()
    for (const p of sorted) {
      const [k, label] = keyOf(p)
      if (!map.has(k)) map.set(k, { key: k, label, parts: [], rgb: groupBy === 'color' ? p.rgb : undefined, trans: p.isTrans })
      map.get(k)!.parts.push(p)
    }
    const arr = [...map.values()]
    if (groupBy === 'category') arr.sort((a, b) => a.label.localeCompare(b.label))
    if (groupBy === 'source') arr.sort((a, b) => (a.key === 'set' ? -1 : b.key === 'set' ? 1 : a.label.localeCompare(b.label)))
    return arr
  }, [base, color, cat, groupBy, catName])

  const visibleCount = groups.reduce((n, g) => n + g.parts.length, 0)
  const groupable = groupBy !== 'none' && groups.length > 1
  const allCollapsed = groupable && groups.every((g) => collapsed.has(g.key))
  const toggleAll = () => {
    const keys = new Set(groups.map((g) => g.key))
    const others = collapsedList.filter((k) => !keys.has(k))
    setCollapsedList(allCollapsed ? others : [...others, ...keys])
  }

  async function refetch() {
    setMenu(false)
    setError(null)
    setBusy(t('fetch.refetching'))
    try {
      const { set: s, parts: p } = await fetchSet(setNum, (m) => setBusy(m))
      await saveSet(s, p)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(null)
    }
  }
  function reset() {
    setMenu(false)
    setAsk('reset')
  }
  function remove() {
    setMenu(false)
    setAsk('delete')
  }
  async function onConfirm() {
    const action = ask
    setAsk(null)
    if (action === 'reset') {
      await resetProgress(setNum)
    } else if (action === 'delete') {
      await deleteSet(setNum)
      go('/')
    }
  }

  if (set === undefined || parts === undefined) return <main className="page" />
  if (set === null) {
    return (
      <>
        <Header title={t('set.notFound')} back="#/" />
        <main className="page">
          <p className="muted">{t('set.notFoundText')}</p>
        </main>
      </>
    )
  }

  const pct = stats.total ? stats.found / stats.total : 0
  const left = stats.total - stats.found
  const pctInt = Math.floor(pct * 100)

  return (
    <>
      <Header
        back="#/"
        title={set.name}
        sub={`${set.setNum} · ${set.year}`}
      />
      <main className="page detail">
        <section className="summary">
          {set.imgUrl && <img className="summary-img" src={set.imgUrl} alt="" />}
          <div className="summary-body">
            <div className="summary-numbers">
              <span className="big">{left === 0 ? t('set.complete') : left}</span>
              <span className="muted">{left === 0 ? t('set.allFound', { n: stats.total }) : t('set.leftOf', { n: stats.total })}</span>
            </div>
            <div className="bar" aria-label={t('set.pctFound', { p: pctInt })}>
              <span style={{ width: `${pct * 100}%` }} className={left === 0 ? 'done' : ''} />
            </div>
            <span className="muted small">
              {t('set.lotsDone', { p: pctInt, a: stats.lotsDone, b: stats.lotsTotal })}
            </span>
          </div>
          <div className="menu-wrap summary-menu">
            <button className="icon-btn gear-btn" onClick={() => setMenu(!menu)} aria-label={t('set.menu')} aria-expanded={menu}>
              <Icon name="gear" size={24} stroke={1.6} />
            </button>
            {menu && (
              <>
                <div className="menu-backdrop" onClick={() => setMenu(false)} />
                <div className="menu" role="menu">
                  <a
                    href={`https://www.lego.com/service/building-instructions/${set.setNum.replace(/-\d+$/, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMenu(false)}
                  >
                    {t('set.instructions')}
                  </a>
                  <button onClick={refetch}>{t('set.refetch')}</button>
                  <button onClick={reset}>{t('set.resetProgress')}</button>
                  <button className="danger" onClick={remove}>
                    {t('set.delete')}
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        {busy && (
          <p className="notice">
            <span className="spinner" /> {busy}
          </p>
        )}
        {error && <p className="error">{error}</p>}

        <div className="options-row">
          <label className="select">
            <span className="muted">{t('set.category')}</span>
            <select value={cat ?? ''} onChange={(e) => setCat(e.target.value ? Number(e.target.value) : null)}>
              <option value="">{t('set.all')}</option>
              {catOptions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.n})
                </option>
              ))}
            </select>
          </label>
          <label className="select">
            <span className="muted">{t('set.group')}</span>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupBy)}>
              {GROUP_BYS.map((g) => (
                <option key={g} value={g}>
                  {t(`groupBy.${g}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="toggle">
            <input type="checkbox" checked={showSpares} onChange={(e) => setShowSpares(e.target.checked)} />
            <span>{t('set.spares')}</span>
          </label>
          {groupable && (
            <button className="link-btn" onClick={toggleAll}>
              {allCollapsed ? t('set.expandAll') : t('set.collapseAll')}
            </button>
          )}
        </div>

        <div className="toolbar">
          <div className="toolbar-row">
            <div className="segmented" role="tablist">
              {STATUSES.map((s) => (
                <button key={s} role="tab" aria-selected={status === s} className={status === s ? 'on' : ''} onClick={() => setStatus(s)}>
                  {t(`status.${s}`)}
                </button>
              ))}
            </div>
            {status === 'left' && (
              <button
                className="icon-btn refresh-btn"
                onClick={() => setSticky(new Set())}
                disabled={sticky.size === 0}
                aria-label={t('set.refresh')}
                title={t('set.refresh')}
              >
                <Icon name="refresh" size={18} />
              </button>
            )}
            <label className="search-field compact">
              <Icon name="search" size={16} />
              <input type="search" placeholder={t('set.searchPart')} value={q} onChange={(e) => setQ(e.target.value)} />
            </label>
          </div>
          <ChipScroller label={t('set.colors')} activeKey={color}>
            <button className={color == null ? 'chip on' : 'chip'} onClick={() => setColor(null)}>
              {t('set.allColors')}
            </button>
            {colorChips.map((c) => (
              <button key={c.id} className={color === c.id ? 'chip on' : 'chip'} onClick={() => setColor(color === c.id ? null : c.id)} title={c.name}>
                <ColorDot rgb={c.rgb} trans={c.trans} size={12} />
                <span>{c.name}</span>
                <span className="chip-n">{c.n}</span>
              </button>
            ))}
          </ChipScroller>
        </div>

        {visibleCount === 0 && (
          <div className="empty">
            {status === 'left' && left === 0 && !q && color == null && cat == null ? (
              <>
                <p>{t('set.allFoundTitle')}</p>
                <p className="muted small">{t('set.isComplete')}</p>
              </>
            ) : (
              <p className="muted">{t('set.noMatch')}</p>
            )}
          </div>
        )}

        {groups.map((g) => {
          const isCollapsed = !!g.label && collapsed.has(g.key)
          return (
            <section key={g.key} className={isCollapsed ? 'group collapsed' : 'group'}>
              {g.label && (
                <h2 className="group-head">
                  <button onClick={() => toggleGroup(g.key)} aria-expanded={!isCollapsed}>
                    <span className="group-chev">
                      <Icon name="next" size={16} />
                    </span>
                    {g.rgb && <ColorDot rgb={g.rgb} trans={g.trans} />}
                    <span>{g.label}</span>
                    <span className="muted">
                      {t('set.groupLeft', { n: g.parts.reduce((n, p) => n + (p.isSpare ? 0 : Math.max(0, p.qty - (prog.get(p.key) ?? 0))), 0) })}
                      {isCollapsed && t('set.groupLots', { n: g.parts.length })}
                    </span>
                  </button>
                </h2>
              )}
              {!isCollapsed && (
                <div className="part-list">
                  {g.parts.map((p) => (
                    <PartRow key={p.key} part={p} found={prog.get(p.key) ?? 0} catName={catName(p.catId)} onSet={onSet} />
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </main>
      {ask && (
        <ConfirmDialog
          title={ask === 'reset' ? t('set.confirmReset') : t('set.confirmDelete', { name: set.name })}
          text={t('set.cannotUndo')}
          confirmLabel={ask === 'reset' ? t('set.resetBtn') : t('set.deleteBtn')}
          danger
          onConfirm={onConfirm}
          onCancel={() => setAsk(null)}
        />
      )}
    </>
  )
}
