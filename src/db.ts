import Dexie, { type EntityTable } from 'dexie'
import { t } from './i18n'

export interface LegoSet {
  setNum: string
  name: string
  year: number
  numParts: number
  imgUrl: string | null
  themeId?: number
  addedAt: number
  lastOpenedAt: number
  fetchedAt: number
}

export interface Part {
  /** Stable key: setNum|source|partNum|colorId|spare */
  key: string
  setNum: string
  /** 'set' or minifig id (e.g. fig-001234) */
  source: string
  sourceName?: string
  partNum: string
  name: string
  catId: number
  colorId: number
  colorName: string
  rgb: string
  isTrans: boolean
  elementId: string | null
  blPartId: string | null
  blColorId: number | null
  legoColorId: number | null
  imgUrl: string | null
  qty: number
  isSpare: boolean
}

export interface Progress {
  key: string
  setNum: string
  found: number
  updatedAt: number
}

export interface Meta {
  k: string
  v: unknown
}

export const db = new Dexie('brikkesjekk') as Dexie & {
  sets: EntityTable<LegoSet, 'setNum'>
  parts: EntityTable<Part, 'key'>
  progress: EntityTable<Progress, 'key'>
  meta: EntityTable<Meta, 'k'>
}

db.version(1).stores({
  sets: '&setNum, lastOpenedAt',
  parts: '&key, setNum',
  progress: '&key, setNum',
  meta: '&k',
})

export function partKey(setNum: string, source: string, partNum: string, colorId: number, isSpare: boolean) {
  return `${setNum}|${source}|${partNum}|${colorId}|${isSpare ? 1 : 0}`
}

export async function getMeta<T>(k: string): Promise<T | undefined> {
  return (await db.meta.get(k))?.v as T | undefined
}

export async function setMeta(k: string, v: unknown) {
  await db.meta.put({ k, v })
}

/** Replace a set's part list. Progress is stored separately and is kept. */
export async function saveSet(set: LegoSet, parts: Part[]) {
  await db.transaction('rw', db.sets, db.parts, async () => {
    const existing = await db.sets.get(set.setNum)
    await db.sets.put({ ...set, addedAt: existing?.addedAt ?? set.addedAt })
    await db.parts.where('setNum').equals(set.setNum).delete()
    await db.parts.bulkPut(parts)
  })
}

export async function setFound(part: Part, found: number) {
  const value = Math.max(0, Math.min(part.qty, found))
  await db.progress.put({ key: part.key, setNum: part.setNum, found: value, updatedAt: Date.now() })
}

export async function resetProgress(setNum: string) {
  await db.progress.where('setNum').equals(setNum).delete()
}

export async function deleteSet(setNum: string) {
  await db.transaction('rw', db.sets, db.parts, db.progress, async () => {
    await db.sets.delete(setNum)
    await db.parts.where('setNum').equals(setNum).delete()
    await db.progress.where('setNum').equals(setNum).delete()
  })
}

export async function touchSet(setNum: string) {
  await db.sets.update(setNum, { lastOpenedAt: Date.now() })
}

export interface ExportFile {
  app: 'brikkesjekk'
  version: 1
  exportedAt: string
  sets: LegoSet[]
  parts: Part[]
  progress: Progress[]
}

export async function exportAll(): Promise<ExportFile> {
  const [sets, parts, progress] = await Promise.all([
    db.sets.toArray(),
    db.parts.toArray(),
    db.progress.toArray(),
  ])
  return { app: 'brikkesjekk', version: 1, exportedAt: new Date().toISOString(), sets, parts, progress }
}

export async function importAll(data: ExportFile) {
  if (data?.app !== 'brikkesjekk' || !Array.isArray(data.sets)) {
    throw new Error(t('err.badImport'))
  }
  await db.transaction('rw', db.sets, db.parts, db.progress, async () => {
    await db.sets.bulkPut(data.sets)
    await db.parts.bulkPut(data.parts ?? [])
    await db.progress.bulkPut(data.progress ?? [])
  })
  return data.sets.length
}
