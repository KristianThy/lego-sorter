import { useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, deleteSets, getMeta, resetProgressMany, type LegoSet } from '../db'
import { getThemes, themePath, type Themes } from '../api/rebrickable'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { ProgressRing } from '../components/ProgressRing'
import { setHref } from '../router'
import { computeStats, progressMap } from '../stats'
import { usePref } from '../prefs'
import { t, useLang } from '../i18n'

type SetGroupBy = 'theme' | 'tag' | 'none'
const SET_GROUP_BYS: SetGroupBy[] = ['theme', 'tag', 'none']

interface SetGroup {
  key: string
  label: string
  /** Fallback groups ("unknown theme", "uncategorized") sort last. */
  last: boolean
  sets: LegoSet[]
}

const LONG_PRESS_MS = 500

function SetCard({
  set,
  themeLabel,
  selecting,
  selected,
  onToggle,
  onLongPress,
}: {
  set: LegoSet
  themeLabel?: string
  selecting: boolean
  selected: boolean
  onToggle: () => void
  onLongPress: () => void
}) {
  useLang()
  const stats = useLiveQuery(async () => {
    const [parts, prog] = await Promise.all([
      db.parts.where('setNum').equals(set.setNum).toArray(),
      db.progress.where('setNum').equals(set.setNum).toArray(),
    ])
    return computeStats(parts, progressMap(prog))
  }, [set.setNum])

  // Long press (touch or mouse) enters selection mode with this set selected.
  // The card stays the same <a> element in both modes, so the click that ends
  // a long press lands here and can be swallowed.
  const press = useRef<{ x: number; y: number; timer: number; fired: boolean; touch: boolean } | null>(null)
  const cancelPress = () => {
    if (press.current) clearTimeout(press.current.timer)
  }
  const onPointerDown = (e: PointerEvent) => {
    cancelPress()
    const touch = e.pointerType !== 'mouse'
    if (selecting || (!touch && e.button !== 0)) {
      press.current = null
      return
    }
    const p = { x: e.clientX, y: e.clientY, fired: false, touch, timer: 0 }
    p.timer = window.setTimeout(() => {
      p.fired = true
      onLongPress()
    }, LONG_PRESS_MS)
    press.current = p
  }
  const onPointerMove = (e: PointerEvent) => {
    const p = press.current
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > 10) cancelPress()
  }
  const onClick = (e: MouseEvent) => {
    const p = press.current
    press.current = null
    if (p?.fired) return e.preventDefault()
    if (selecting) {
      e.preventDefault()
      onToggle()
    }
  }

  const value = stats && stats.total ? stats.found / stats.total : 0
  const left = stats ? stats.total - stats.found : 0
  return (
    <a
      className={selecting ? (selected ? 'set-card selecting selected' : 'set-card selecting') : 'set-card'}
      href={setHref(set.setNum)}
      role={selecting ? 'checkbox' : undefined}
      aria-checked={selecting ? selected : undefined}
      onClick={onClick}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={cancelPress}
      onPointerCancel={cancelPress}
      onPointerLeave={cancelPress}
      onContextMenu={(e) => {
        // Keep the browser's link menu from popping up on a touch long-press.
        if (press.current?.touch || selecting) e.preventDefault()
      }}
      onKeyDown={(e) => {
        if (selecting && e.key === ' ') {
          e.preventDefault()
          onToggle()
        }
      }}
    >
      {selecting && (
        <span className="select-check" aria-hidden>
          {selected && <Icon name="check" size={14} stroke={3} />}
        </span>
      )}
      <div className="set-thumb">{set.imgUrl ? <img src={set.imgUrl} alt="" loading="lazy" /> : null}</div>
      <div className="set-info">
        <strong className="clamp">{set.name}</strong>
        <span className="muted small one-line">
          {set.setNum} · {set.year}
          {themeLabel && ` · ${themeLabel}`}
        </span>
        <span className="small">
          {stats ? (left === 0 ? <span className="ok">{t('set.complete')}</span> : t('mySets.left', { n: left })) : '…'}
        </span>
      </div>
      <ProgressRing value={value} />
    </a>
  )
}

export function MySets({ hasKey }: { hasKey: boolean }) {
  useLang()
  const sets = useLiveQuery(() => db.sets.orderBy('lastOpenedAt').reverse().toArray(), [])
  const themes = useLiveQuery(async () => (await getMeta<Themes>('themes')) ?? null, [])
  const [groupBy, setGroupBy] = usePref<SetGroupBy>('setGroupBy', 'theme')
  const [collapsedList, setCollapsedList] = usePref<string[]>('setsCollapsed', [])
  const collapsed = useMemo(() => new Set(collapsedList), [collapsedList])
  const toggleGroup = (key: string) =>
    setCollapsedList(collapsed.has(key) ? collapsedList.filter((k) => k !== key) : [...collapsedList, key])

  // ---- Multi-select (bulk reset / delete) ----
  const [selecting, setSelecting] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(() => new Set())
  const [ask, setAsk] = useState<'reset' | 'delete' | null>(null)
  // Only sets that still exist count (one may have been deleted elsewhere).
  const chosen = useMemo(() => (sets ?? []).filter((s) => selected.has(s.setNum)).map((s) => s.setNum), [sets, selected])

  const exitSelect = () => {
    setSelecting(false)
    setSelected(new Set())
  }
  const setMany = (setNums: string[], on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev)
      for (const n of setNums) {
        if (on) next.add(n)
        else next.delete(n)
      }
      return next
    })
  const startSelect = (setNum?: string) => {
    setSelecting(true)
    setSelected(new Set(setNum ? [setNum] : []))
  }

  useEffect(() => {
    if (!selecting || ask) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') exitSelect()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selecting, ask])

  useEffect(() => {
    if (selecting && sets && sets.length === 0) exitSelect()
  }, [selecting, sets])

  async function onConfirm() {
    const action = ask
    const nums = chosen
    setAsk(null)
    if (action === 'reset') await resetProgressMany(nums)
    else if (action === 'delete') await deleteSets(nums)
    exitSelect()
  }

  // Fetch theme names once, and again if a set has a theme we don't know yet.
  const themeFetchTried = useRef(false)
  useEffect(() => {
    if (!hasKey || !sets || themes === undefined || themeFetchTried.current) return
    const missing = themes === null || sets.some((s) => s.themeId != null && !themes[s.themeId])
    if (!missing) return
    themeFetchTried.current = true
    void getThemes(themes !== null).catch(() => undefined)
  }, [hasKey, sets, themes])

  const pathOf = (s: LegoSet) => (themes && s.themeId != null ? themePath(themes, s.themeId) : [])

  // Grouping by theme needs theme names; show a flat list until they arrive.
  const mode: SetGroupBy = groupBy === 'theme' && !themes ? 'none' : groupBy

  const groups = useMemo((): SetGroup[] => {
    if (!sets) return []
    if (mode === 'none') return [{ key: 'all', label: '', last: false, sets }]
    const map = new Map<string, SetGroup>()
    const add = (key: string, label: string, s: LegoSet, last = false) => {
      if (!map.has(key)) map.set(key, { key, label, last, sets: [] })
      map.get(key)!.sets.push(s)
    }
    for (const s of sets) {
      if (mode === 'theme') {
        const root = pathOf(s)[0]
        if (root) add(`t:${root.id}`, root.name, s)
        else add('t:?', t('mySets.unknownTheme'), s, true)
      } else {
        const tags = s.tags ?? []
        if (tags.length === 0) add('g:', t('mySets.noTag'), s, true)
        for (const tag of tags) add(`g:${tag}`, tag, s)
      }
    }
    return [...map.values()].sort((a, b) => Number(a.last) - Number(b.last) || a.label.localeCompare(b.label))
  }, [sets, themes, mode])

  // Grouped by top-level theme: show only the sub-theme on the card. Otherwise the full path.
  const themeLabel = (s: LegoSet) => {
    const path = pathOf(s)
    return (mode === 'theme' ? path.slice(1) : path).map((p) => p.name).join(' › ') || undefined
  }

  const grouped = mode !== 'none'
  const allCollapsed = grouped && groups.every((g) => collapsed.has(g.key))
  const toggleAll = () => {
    const keys = new Set(groups.map((g) => g.key))
    const others = collapsedList.filter((k) => !keys.has(k))
    setCollapsedList(allCollapsed ? others : [...others, ...keys])
  }
  const allSelected = !!sets && sets.length > 0 && chosen.length === sets.length

  return (
    <>
      <Header title={selecting ? t('mySets.selectedN', { n: chosen.length }) : t('mySets.title')} />
      <main className="page">
        {sets && (
          <div className="options-row">
            {sets.length > 0 && (
              <label className="select">
                <span className="muted">{t('set.group')}</span>
                <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as SetGroupBy)}>
                  {SET_GROUP_BYS.map((g) => (
                    <option key={g} value={g}>
                      {t(`setGroup.${g}`)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {grouped && groups.length > 1 && (
              <button className="link-btn" onClick={toggleAll}>
                {allCollapsed ? t('set.expandAll') : t('set.collapseAll')}
              </button>
            )}
            {selecting && (
              <button
                className="link-btn"
                onClick={() => setSelected(new Set(allSelected ? [] : sets.map((s) => s.setNum)))}
              >
                {allSelected ? t('mySets.selectNone') : t('mySets.selectAll')}
              </button>
            )}
            <div className="options-actions">
              {selecting ? (
                <button className="icon-btn sm" onClick={exitSelect} aria-label={t('mySets.exitSelect')} title={t('mySets.exitSelect')}>
                  <Icon name="x" />
                </button>
              ) : (
                <>
                  {sets.length > 0 && (
                    <a className="icon-btn sm" href="#/find" aria-label={t('find.title')} title={t('find.title')}>
                      <Icon name="search" />
                    </a>
                  )}
                  {sets.length > 0 && (
                    <button className="icon-btn sm" onClick={() => startSelect()} aria-label={t('mySets.select')} title={t('mySets.select')}>
                      <Icon name="select" />
                    </button>
                  )}
                  <a className="icon-btn sm" href="#/settings" aria-label={t('settings.title')} title={t('settings.title')}>
                    <Icon name="settings" />
                  </a>
                  {hasKey && (
                    <a className="btn primary add-set" href="#/search">
                      <Icon name="plus" size={18} /> {t('mySets.add')}
                    </a>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        {!hasKey && (
          <div className="callout">
            <strong>{t('mySets.getStarted')}</strong>
            <p className="muted">{t('mySets.getStartedText')}</p>
            <a className="btn primary" href="#/settings">
              {t('mySets.addKey')}
            </a>
          </div>
        )}
        {sets && sets.length === 0 && hasKey && (
          <div className="empty">
            <p>{t('mySets.empty')}</p>
            <p className="muted small">{t('mySets.emptyHint')}</p>
          </div>
        )}
        {groups.map((g) => {
          const isCollapsed = grouped && collapsed.has(g.key)
          const list = (
            <div className="set-list">
              {g.sets.map((s) => (
                <SetCard
                  key={s.setNum}
                  set={s}
                  themeLabel={themeLabel(s)}
                  selecting={selecting}
                  selected={selected.has(s.setNum)}
                  onToggle={() => setMany([s.setNum], !selected.has(s.setNum))}
                  onLongPress={() => startSelect(s.setNum)}
                />
              ))}
            </div>
          )
          if (!grouped) return <div key={g.key}>{list}</div>
          const groupNums = g.sets.map((s) => s.setNum)
          const nSel = groupNums.filter((n) => selected.has(n)).length
          const state = nSel === 0 ? 'none' : nSel === groupNums.length ? 'all' : 'some'
          return (
            <section key={g.key} className={isCollapsed ? 'group collapsed' : 'group'}>
              <h2 className="group-head">
                {selecting && (
                  <button
                    className={`group-select ${state}`}
                    role="checkbox"
                    aria-checked={state === 'all' ? true : state === 'some' ? 'mixed' : false}
                    aria-label={t('mySets.selectGroup', { name: g.label })}
                    title={t('mySets.selectGroup', { name: g.label })}
                    onClick={() => setMany(groupNums, state !== 'all')}
                  >
                    <span className="select-check" aria-hidden>
                      {state === 'all' && <Icon name="check" size={14} stroke={3} />}
                      {state === 'some' && <Icon name="minus" size={14} stroke={3} />}
                    </span>
                  </button>
                )}
                <button onClick={() => toggleGroup(g.key)} aria-expanded={!isCollapsed}>
                  <span className="group-chev">
                    <Icon name="next" size={16} />
                  </span>
                  <span>{g.label}</span>
                  <span className="muted">{t('mySets.setsN', { n: g.sets.length })}</span>
                </button>
              </h2>
              {!isCollapsed && list}
            </section>
          )
        })}
      </main>
      {selecting && (
        <div className="select-bar">
          <button className="btn" disabled={chosen.length === 0} onClick={() => setAsk('reset')}>
            <Icon name="refresh" size={18} /> {t('set.resetProgress')}
          </button>
          <button className="btn danger" disabled={chosen.length === 0} onClick={() => setAsk('delete')}>
            <Icon name="x" size={18} /> {t('set.deleteBtn')}
          </button>
        </div>
      )}
      {ask && (
        <ConfirmDialog
          title={ask === 'reset' ? t('mySets.confirmResetN', { n: chosen.length }) : t('mySets.confirmDeleteN', { n: chosen.length })}
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
