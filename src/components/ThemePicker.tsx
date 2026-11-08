import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { themePath, type Themes } from '../api/rebrickable'
import { Icon } from './Icon'
import { t, useLang } from '../i18n'

/** Row id for "All themes" (no filter). */
const ALL = -1
const MAX_MATCHES = 100

interface Row {
  id: number
  name: string
  depth: number
  hasChildren: boolean
  /** Parent themes, shown under the name when searching. */
  path?: string
}

/**
 * Theme combobox: browse themes as a collapsible tree, or type to filter
 * (every word must appear somewhere in the theme's path, e.g. "star ucs").
 */
export function ThemePicker({
  themes,
  value,
  onChange,
}: {
  themes: Themes | null | undefined
  value: number | null
  onChange: (id: number | null) => void
}) {
  const lang = useLang()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set())
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const scrollToActive = useRef(false)
  const baseId = useId()
  const listId = `${baseId}-list`
  const optId = (i: number) => `${baseId}-opt-${i}`

  const children = useMemo(() => {
    const map = new Map<number | null, number[]>()
    if (!themes) return map
    for (const [k, th] of Object.entries(themes)) {
      const parent = th.parentId != null && themes[th.parentId] ? th.parentId : null
      const list = map.get(parent) ?? []
      list.push(Number(k))
      map.set(parent, list)
    }
    for (const list of map.values()) list.sort((a, b) => themes[a].name.localeCompare(themes[b].name))
    return map
  }, [themes])

  const term = query?.trim().toLowerCase() ?? ''
  const searching = term.length > 0

  const rows = useMemo((): Row[] => {
    if (!themes) return []
    if (searching) {
      const tokens = term.split(/\s+/)
      const hits: (Row & { rank: number; full: string })[] = []
      for (const k of Object.keys(themes)) {
        const id = Number(k)
        const path = themePath(themes, id).map((p) => p.name)
        const full = path.join(' › ')
        const lower = full.toLowerCase()
        if (!tokens.every((tok) => lower.includes(tok))) continue
        const name = themes[id].name
        const n = name.toLowerCase()
        const rank = n.startsWith(tokens[0]) ? 0 : n.includes(tokens[0]) ? 1 : 2
        hits.push({ id, name, depth: 0, hasChildren: false, path: path.slice(0, -1).join(' › '), rank, full })
      }
      hits.sort((a, b) => a.rank - b.rank || a.full.localeCompare(b.full))
      return hits.slice(0, MAX_MATCHES)
    }
    const out: Row[] = [{ id: ALL, name: t('search.allThemes'), depth: 0, hasChildren: false }]
    const walk = (parent: number | null, depth: number) => {
      for (const id of children.get(parent) ?? []) {
        const kids = children.get(id)
        out.push({ id, name: themes[id].name, depth, hasChildren: !!kids?.length })
        if (kids && expanded.has(id)) walk(id, depth + 1)
      }
    }
    walk(null, 0)
    return out
  }, [themes, children, searching, term, expanded, lang])

  const selectedId = value ?? ALL

  function openPicker() {
    if (open) return
    // Expand the path down to the selected theme so it is visible in the tree.
    if (themes && value != null) {
      const ancestors = themePath(themes, value).slice(0, -1).map((p) => p.id)
      if (ancestors.length) setExpanded((prev) => new Set([...prev, ...ancestors]))
    }
    setQuery(null)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setQuery(null)
  }

  // On open, highlight the current choice.
  useEffect(() => {
    if (!open) return
    scrollToActive.current = true
    setActive(Math.max(0, rows.findIndex((r) => r.id === selectedId)))
  }, [open])

  useEffect(() => {
    if (open) setActive(0)
  }, [term])

  useEffect(() => {
    if (!open || !scrollToActive.current) return
    scrollToActive.current = false
    document.getElementById(optId(active))?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const moveTo = (i: number) => {
    scrollToActive.current = true
    setActive(Math.max(0, Math.min(rows.length - 1, i)))
  }

  function choose(row: Row) {
    onChange(row.id === ALL ? null : row.id)
    close()
  }

  function toggle(id: number, on?: boolean) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (on ?? !next.has(id)) next.add(id)
      else next.delete(id)
      return next
    })
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    const row = rows[active]
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        if (!open) openPicker()
        else moveTo(active + 1)
        break
      case 'ArrowUp':
        e.preventDefault()
        if (open) moveTo(active - 1)
        break
      case 'Home':
      case 'End':
        if (open && !searching) {
          e.preventDefault()
          moveTo(e.key === 'Home' ? 0 : rows.length - 1)
        }
        break
      case 'ArrowRight':
        // In the tree (not while typing) the arrows open and close sub-themes.
        if (open && !searching && row?.hasChildren) {
          e.preventDefault()
          if (!expanded.has(row.id)) toggle(row.id, true)
          else moveTo(active + 1)
        }
        break
      case 'ArrowLeft':
        if (open && !searching && row) {
          e.preventDefault()
          if (row.hasChildren && expanded.has(row.id)) toggle(row.id, false)
          else if (themes && row.id !== ALL && themes[row.id].parentId != null) {
            moveTo(rows.findIndex((r) => r.id === themes[row.id].parentId))
          }
        }
        break
      case 'Enter':
        if (open && row) {
          e.preventDefault()
          choose(row)
        }
        break
      case 'Escape':
        if (open) {
          e.preventDefault()
          close()
        }
        break
    }
  }

  const display = value != null && themes?.[value] ? themePath(themes, value).map((p) => p.name).join(' › ') : ''

  return (
    <div className={open ? 'theme-picker open' : 'theme-picker'}>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-label={t('search.theme')}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && rows[active] ? optId(active) : undefined}
        autoComplete="off"
        spellCheck={false}
        placeholder={t('search.allThemes')}
        title={display || undefined}
        value={query ?? display}
        onFocus={(e) => {
          openPicker()
          e.target.select()
        }}
        onClick={openPicker}
        onBlur={close}
        onChange={(e) => {
          setQuery(e.target.value)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {value != null && (
        <button
          type="button"
          className="theme-clear"
          aria-label={t('search.clearTheme')}
          title={t('search.clearTheme')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            onChange(null)
            close()
          }}
        >
          <Icon name="x" size={14} />
        </button>
      )}
      <span className="theme-caret" aria-hidden>
        <Icon name="next" size={14} />
      </span>
      {open && (
        // mousedown is cancelled so the input keeps focus (and the list stays open) while clicking rows.
        <ul id={listId} className="theme-list" role={searching ? 'listbox' : 'tree'} onMouseDown={(e) => e.preventDefault()}>
          {rows.length === 0 && (
            <li className="theme-empty muted">{themes ? t('search.noThemes') : t('search.loadingThemes')}</li>
          )}
          {rows.map((r, i) => {
            const isOpen = expanded.has(r.id)
            const cls = ['theme-row', i === active && 'active', r.id === selectedId && 'selected'].filter(Boolean).join(' ')
            return (
              <li
                key={r.id}
                id={optId(i)}
                role={searching ? 'option' : 'treeitem'}
                aria-selected={r.id === selectedId}
                aria-level={searching ? undefined : r.depth + 1}
                aria-expanded={!searching && r.hasChildren ? isOpen : undefined}
                className={cls}
                style={{ paddingLeft: 4 + r.depth * 18 }}
                onMouseMove={() => i !== active && setActive(i)}
                onClick={() => choose(r)}
              >
                {!searching &&
                  (r.hasChildren ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      className={isOpen ? 'theme-chev open' : 'theme-chev'}
                      aria-label={isOpen ? t('search.collapse') : t('search.expand')}
                      title={isOpen ? t('search.collapse') : t('search.expand')}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggle(r.id)
                      }}
                    >
                      <Icon name="next" size={14} />
                    </button>
                  ) : (
                    <span className="theme-chev-spacer" />
                  ))}
                <span className="theme-text">
                  <span className="one-line">{r.name}</span>
                  {r.path && <span className="theme-path muted one-line">{r.path}</span>}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
