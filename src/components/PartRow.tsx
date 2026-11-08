import { memo } from 'react'
import type { Part } from '../db'
import { ColorDot } from './ColorDot'
import { Icon } from './Icon'

interface Props {
  part: Part
  found: number
  catName?: string
  onSet: (part: Part, found: number) => void
}

export const PartRow = memo(function PartRow({ part, found, catName, onSet }: Props) {
  const done = found >= part.qty
  const ids = [
    part.partNum,
    part.blPartId && part.blPartId !== part.partNum ? `BL ${part.blPartId}` : null,
    part.elementId ? `Elem ${part.elementId}` : null,
  ].filter(Boolean)
  return (
    <div className={done ? 'part done' : 'part'}>
      <button
        className="part-main"
        onClick={() => !done && onSet(part, found + 1)}
        aria-label={`${part.name}, ${part.colorName}: ${found} av ${part.qty} funne. Trykk for å legge til éin.`}
      >
        <div className="part-img">
          {part.imgUrl ? <img src={part.imgUrl} alt="" loading="lazy" decoding="async" /> : <span className="muted small">?</span>}
          {done && (
            <span className="part-check">
              <Icon name="check" size={14} />
            </span>
          )}
        </div>
        <div className="part-info">
          <span className="part-name clamp">{part.name}</span>
          <span className="part-meta">
            <ColorDot rgb={part.rgb} trans={part.isTrans} size={12} />
            <span>
              {part.colorName}
              {part.blColorId != null && <span className="muted"> · BL {part.blColorId}</span>}
            </span>
          </span>
          <span className="part-ids muted">
            {ids.join(' · ')}
            {catName && <span className="hide-sm"> · {catName}</span>}
          </span>
          {(part.isSpare || part.source !== 'set') && (
            <span className="tags">
              {part.isSpare && <span className="tag">Reserve</span>}
              {part.source !== 'set' && (
                <span className="tag fig" title={part.sourceName}>
                  <Icon name="figure" size={11} /> {part.sourceName ?? part.source}
                </span>
              )}
            </span>
          )}
        </div>
      </button>
      <div className="counter">
        <button className="icon-btn sm" onClick={() => onSet(part, found - 1)} disabled={found <= 0} aria-label="Éin færre">
          <Icon name="minus" size={16} />
        </button>
        <button
          className="count"
          onClick={() => onSet(part, done ? 0 : part.qty)}
          title={done ? 'Nullstill' : 'Merk alle som funne'}
        >
          <b>{found}</b>
          <span className="muted">/{part.qty}</span>
        </button>
        <button className="icon-btn sm" onClick={() => onSet(part, found + 1)} disabled={done} aria-label="Éin til">
          <Icon name="plus" size={16} />
        </button>
      </div>
    </div>
  )
})
