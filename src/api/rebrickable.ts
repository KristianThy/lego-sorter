import { getMeta, partKey, setMeta, type LegoSet, type Part } from '../db'
import { t } from '../i18n'

const BASE = 'https://rebrickable.com/api/v3'
const MIN_GAP_MS = 1100 // Rebrickable allows ~1 request/second

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

let apiKeyCache: string | undefined
export async function getApiKey() {
  if (apiKeyCache === undefined) apiKeyCache = (await getMeta<string>('apiKey')) ?? ''
  return apiKeyCache
}
export async function saveApiKey(key: string) {
  apiKeyCache = key.trim()
  await setMeta('apiKey', apiKeyCache)
}

// Simple serial queue so we never exceed the rate limit.
let chain: Promise<unknown> = Promise.resolve()
let lastCall = 0
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms))

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(async () => {
    const gap = Date.now() - lastCall
    if (gap < MIN_GAP_MS) await wait(MIN_GAP_MS - gap)
    try {
      return await fn()
    } finally {
      lastCall = Date.now()
    }
  })
  chain = run.catch(() => undefined)
  return run
}

async function request<T>(url: string, keyOverride?: string): Promise<T> {
  const key = keyOverride ?? (await getApiKey())
  if (!key) throw new ApiError(t('err.noKey'), 401)
  const full = url.startsWith('http') ? url : BASE + url
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await enqueue(() => fetch(full, { headers: { Authorization: `key ${key}`, Accept: 'application/json' } }))
    if (res.status === 429) {
      const retry = Number(res.headers.get('Retry-After')) || 2 ** attempt * 2
      await wait(retry * 1000)
      continue
    }
    if (res.status === 401 || res.status === 403) throw new ApiError(t('err.keyRejected'), res.status)
    if (res.status === 404) throw new ApiError(t('err.notFound'), 404)
    if (!res.ok) throw new ApiError(t('err.status', { status: res.status }), res.status)
    return (await res.json()) as T
  }
  throw new ApiError(t('err.tooMany'), 429)
}

interface Page<T> {
  count: number
  next: string | null
  results: T[]
}

async function getAll<T>(url: string, onPage?: (n: number, total: number) => void): Promise<T[]> {
  const out: T[] = []
  let next: string | null = url
  while (next) {
    const page: Page<T> = await request<Page<T>>(next)
    out.push(...page.results)
    onPage?.(out.length, page.count)
    next = page.next
  }
  return out
}

// ---------- Types from Rebrickable ----------
export interface RbSet {
  set_num: string
  name: string
  year: number
  theme_id: number
  num_parts: number
  set_img_url: string | null
}

interface RbColor {
  id: number
  name: string
  rgb: string
  is_trans: boolean
  external_ids?: {
    BrickLink?: { ext_ids: number[] }
    LEGO?: { ext_ids: number[] }
  }
}

interface RbInvPart {
  part: {
    part_num: string
    name: string
    part_cat_id: number
    part_img_url: string | null
    external_ids?: { BrickLink?: string[] }
  }
  color: RbColor
  quantity: number
  is_spare: boolean
  element_id: string | null
}

interface RbSetMinifig {
  set_num: string
  set_name: string
  quantity: number
  set_img_url: string | null
}

// ---------- Public API ----------
export function normalizeSetNum(input: string) {
  const s = input.trim()
  return /^\d+$/.test(s) ? `${s}-1` : s
}

export async function testKey(key: string) {
  await request('/lego/colors/?page_size=1', key.trim())
}

export async function searchSets(query: string): Promise<RbSet[]> {
  const q = query.trim()
  if (!q) return []
  const results: RbSet[] = []
  // Exact set number lookup first (e.g. "10270" -> "10270-1")
  if (/^\d{3,}(-\d+)?$/.test(q)) {
    try {
      results.push(await request<RbSet>(`/lego/sets/${encodeURIComponent(normalizeSetNum(q))}/`))
    } catch (e) {
      if (!(e instanceof ApiError && e.status === 404)) throw e
    }
  }
  const page = await request<Page<RbSet>>(`/lego/sets/?search=${encodeURIComponent(q)}&page_size=30&ordering=-year`)
  for (const s of page.results) if (!results.some((r) => r.set_num === s.set_num)) results.push(s)
  return results
}

export async function getCategories(): Promise<Record<number, string>> {
  const cached = await getMeta<Record<number, string>>('categories')
  if (cached) return cached
  const cats = await getAll<{ id: number; name: string }>('/lego/part_categories/?page_size=1000')
  const map = Object.fromEntries(cats.map((c) => [c.id, c.name]))
  await setMeta('categories', map)
  return map
}

export interface ThemeInfo {
  name: string
  parentId: number | null
}
export type Themes = Record<number, ThemeInfo>

/** All Rebrickable themes (~500, one request). Cached; pass `force` to refresh, e.g. when a set has an unknown theme. */
export async function getThemes(force = false): Promise<Themes> {
  if (!force) {
    const cached = await getMeta<Themes>('themes')
    if (cached) return cached
  }
  const list = await getAll<{ id: number; name: string; parent_id: number | null }>('/lego/themes/?page_size=1000')
  const map: Themes = Object.fromEntries(list.map((th) => [th.id, { name: th.name, parentId: th.parent_id }]))
  await setMeta('themes', map)
  return map
}

/** Theme chain from top-level theme down to `id`, e.g. [Star Wars, Ultimate Collector Series]. */
export function themePath(themes: Themes, id: number): { id: number; name: string }[] {
  const path: { id: number; name: string }[] = []
  let cur: number | null = id
  while (cur != null && themes[cur] && path.length < 10) {
    path.unshift({ id: cur, name: themes[cur].name })
    cur = themes[cur].parentId
  }
  return path
}

function toPart(setNum: string, source: string, sourceName: string | undefined, p: RbInvPart, multiplier = 1): Part {
  return {
    key: partKey(setNum, source, p.part.part_num, p.color.id, p.is_spare),
    setNum,
    source,
    sourceName,
    partNum: p.part.part_num,
    name: p.part.name,
    catId: p.part.part_cat_id,
    colorId: p.color.id,
    colorName: p.color.name,
    rgb: p.color.rgb,
    isTrans: p.color.is_trans,
    elementId: p.element_id ?? null,
    blPartId: p.part.external_ids?.BrickLink?.[0] ?? null,
    blColorId: p.color.external_ids?.BrickLink?.ext_ids?.[0] ?? null,
    legoColorId: p.color.external_ids?.LEGO?.ext_ids?.[0] ?? null,
    imgUrl: p.part.part_img_url,
    qty: p.quantity * multiplier,
    isSpare: p.is_spare,
  }
}

function mergeInto(map: Map<string, Part>, part: Part) {
  const existing = map.get(part.key)
  if (existing) existing.qty += part.qty
  else map.set(part.key, part)
}

export type FetchProgress = (msg: string) => void

export async function fetchSet(setNumRaw: string, onProgress?: FetchProgress): Promise<{ set: LegoSet; parts: Part[] }> {
  const setNum = normalizeSetNum(setNumRaw)
  onProgress?.(t('fetch.setInfo'))
  const s = await request<RbSet>(`/lego/sets/${encodeURIComponent(setNum)}/`)

  onProgress?.(t('fetch.parts'))
  void getCategories().catch(() => undefined)
  const inv = await getAll<RbInvPart>(
    `/lego/sets/${encodeURIComponent(setNum)}/parts/?page_size=1000&inc_color_details=1`,
    (n, total) => onProgress?.(t('fetch.partsN', { n, total })),
  )
  const map = new Map<string, Part>()
  for (const p of inv) mergeInto(map, toPart(setNum, 'set', undefined, p))

  onProgress?.(t('fetch.minifigs'))
  const figs = await getAll<RbSetMinifig>(`/lego/sets/${encodeURIComponent(setNum)}/minifigs/?page_size=1000`)
  for (const [i, fig] of figs.entries()) {
    onProgress?.(t('fetch.minifigN', { i: i + 1, total: figs.length }))
    const figParts = await getAll<RbInvPart>(
      `/lego/minifigs/${encodeURIComponent(fig.set_num)}/parts/?page_size=1000&inc_color_details=1`,
    )
    for (const p of figParts) mergeInto(map, toPart(setNum, fig.set_num, fig.set_name, p, fig.quantity))
  }

  const now = Date.now()
  return {
    set: {
      setNum: s.set_num,
      name: s.name,
      year: s.year,
      numParts: s.num_parts,
      imgUrl: s.set_img_url,
      themeId: s.theme_id,
      addedAt: now,
      lastOpenedAt: now,
      fetchedAt: now,
    },
    parts: [...map.values()],
  }
}
