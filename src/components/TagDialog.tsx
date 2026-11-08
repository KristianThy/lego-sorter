import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { allTags, normalizeTag, setSetTags } from '../db'
import { Icon } from './Icon'
import { t, useLang } from '../i18n'

/** Pick which user-defined categories a set belongs to, or create new ones. */
export function TagDialog({ setNum, current, onClose }: { setNum: string; current: string[]; onClose: () => void }) {
  useLang()
  const existing = useLiveQuery(allTags, [])
  const [selected, setSelected] = useState(() => new Set(current))
  const [created, setCreated] = useState<string[]>([])
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const options = useMemo(
    () => [...new Set([...(existing ?? []), ...current, ...created])].sort((a, b) => a.localeCompare(b)),
    [existing, current, created],
  )

  useEffect(() => {
    if (existing && existing.length === 0) inputRef.current?.focus()
  }, [existing])

  const toggle = (tag: string) => {
    const next = new Set(selected)
    if (next.has(tag)) next.delete(tag)
    else next.add(tag)
    setSelected(next)
  }

  function add(e: FormEvent) {
    e.preventDefault()
    const n = normalizeTag(name)
    if (!n) return
    // Reuse an existing category if only the letter case differs.
    const tag = options.find((o) => o.toLocaleLowerCase() === n.toLocaleLowerCase()) ?? n
    if (!options.includes(tag)) setCreated([...created, tag])
    setSelected(new Set(selected).add(tag))
    setName('')
  }

  async function save() {
    await setSetTags(setNum, [...selected])
    onClose()
  }

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal="true" aria-labelledby="tags-title" onClick={(e) => e.stopPropagation()}>
        <h2 id="tags-title">{t('tags.title')}</h2>
        <p className="muted">{t('tags.help')}</p>
        <div className="tag-options">
          {existing === undefined ? null : options.length === 0 ? (
            <p className="muted small">{t('tags.none')}</p>
          ) : (
            options.map((o) => {
              const on = selected.has(o)
              return (
                <button key={o} type="button" className={on ? 'chip on' : 'chip'} aria-pressed={on} onClick={() => toggle(o)}>
                  {on && <Icon name="check" size={14} />}
                  <span>{o}</span>
                </button>
              )
            })
          )}
        </div>
        <form className="row" onSubmit={add}>
          <input
            ref={inputRef}
            className="input plain"
            placeholder={t('tags.new')}
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
          />
          <button className="btn" type="submit" disabled={!normalizeTag(name)}>
            <Icon name="plus" size={16} /> {t('tags.add')}
          </button>
        </form>
        <div className="dialog-actions">
          <button className="btn" onClick={onClose}>
            {t('cancel')}
          </button>
          <button className="btn primary" onClick={save}>
            {t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  )
}
