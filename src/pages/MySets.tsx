import { useEffect, useMemo, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db, getMeta, type LegoSet } from '../db'
import { getThemes, themePath, type Themes } from '../api/rebrickable'
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

function SetCard({ set, themeLabel }: { set: LegoSet; themeLabel?: string }) {
  useLang()
  const stats = useLiveQuery(async () => {
    const [parts, prog] = await Promise.all([
      db.parts.where('setNum').equals(set.setNum).toArray(),
      db.progress.where('setNum').equals(set.setNum).toArray(),
    ])
    return computeStats(parts, progressMap(prog))
  }, [set.setNum])
  const value = stats && stats.total ? stats.found / stats.total : 0
  const left = stats ? stats.total - stats.found : 0
  return (
    <a className="set-card" href={setHref(set.setNum)}>
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

  return (
    <>
      <Header
        title={t('mySets.title')}
        actions={
          <a className="icon-btn" href="#/settings" aria-label={t('settings.title')}>
            <Icon name="settings" />
          </a>
        }
      />
      <main className="page">
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
        {sets && sets.length > 0 && (
          <div className="options-row">
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
            {grouped && groups.length > 1 && (
              <button className="link-btn" onClick={toggleAll}>
                {allCollapsed ? t('set.expandAll') : t('set.collapseAll')}
              </button>
            )}
          </div>
        )}
        {groups.map((g) => {
          const isCollapsed = grouped && collapsed.has(g.key)
          const list = (
            <div className="set-list">
              {g.sets.map((s) => (
                <SetCard key={s.setNum} set={s} themeLabel={themeLabel(s)} />
              ))}
            </div>
          )
          if (!grouped) return <div key={g.key}>{list}</div>
          return (
            <section key={g.key} className={isCollapsed ? 'group collapsed' : 'group'}>
              <h2 className="group-head">
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
      {hasKey && (
        <a className="fab" href="#/search">
          <Icon name="plus" /> {t('mySets.add')}
        </a>
      )}
    </>
  )
}
