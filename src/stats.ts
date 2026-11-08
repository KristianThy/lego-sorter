import type { Part, Progress } from './db'

export interface SetStats {
  total: number
  found: number
  lotsTotal: number
  lotsDone: number
}

/** Progress counts exclude spare parts. */
export function computeStats(parts: Part[], progress: Map<string, number>): SetStats {
  let total = 0, found = 0, lotsTotal = 0, lotsDone = 0
  for (const p of parts) {
    if (p.isSpare) continue
    const f = Math.min(progress.get(p.key) ?? 0, p.qty)
    total += p.qty
    found += f
    lotsTotal++
    if (f >= p.qty) lotsDone++
  }
  return { total, found, lotsTotal, lotsDone }
}

export function progressMap(rows: Progress[]) {
  return new Map(rows.map((r) => [r.key, r.found]))
}
