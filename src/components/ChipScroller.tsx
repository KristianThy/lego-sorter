import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { Icon } from './Icon'

/**
 * Horizontally scrolling chip strip with prev/next arrows that page through it.
 * Arrows only show when there is more content in that direction.
 * `activeKey` changes scroll the `.chip.on` element into view.
 */
export function ChipScroller({ children, label, activeKey }: { children: ReactNode; label: string; activeKey?: unknown }) {
  const ref = useRef<HTMLDivElement>(null)
  const [canPrev, setCanPrev] = useState(false)
  const [canNext, setCanNext] = useState(false)

  const update = useCallback(() => {
    const el = ref.current
    if (!el) return
    setCanPrev(el.scrollLeft > 1)
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1)
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    for (const c of el.children) ro.observe(c)
    return () => ro.disconnect()
  }, [update, children])

  useEffect(() => {
    // Scroll only the strip (scrollIntoView could also move the page vertically).
    const el = ref.current
    const on = el?.querySelector<HTMLElement>('.chip.on')
    if (!el || !on) return
    const pad = 52 // keep clear of the arrow overlay
    const a = el.getBoundingClientRect()
    const b = on.getBoundingClientRect()
    if (b.left < a.left + pad) el.scrollBy({ left: b.left - a.left - pad, behavior: 'smooth' })
    else if (b.right > a.right - pad) el.scrollBy({ left: b.right - a.right + pad, behavior: 'smooth' })
  }, [activeKey])

  const page = (dir: -1 | 1) => {
    const el = ref.current
    if (!el) return
    el.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.75), behavior: 'smooth' })
  }

  return (
    <div className="chips-wrap">
      <div className="chips" ref={ref} onScroll={update} aria-label={label}>
        {children}
      </div>
      <button className={`chips-arrow prev${canPrev ? ' show' : ''}`} onClick={() => page(-1)} aria-label="Bla tilbake" tabIndex={canPrev ? 0 : -1}>
        <Icon name="back" size={18} />
      </button>
      <button className={`chips-arrow next${canNext ? ' show' : ''}`} onClick={() => page(1)} aria-label="Bla fram" tabIndex={canNext ? 0 : -1}>
        <Icon name="next" size={18} />
      </button>
    </div>
  )
}
