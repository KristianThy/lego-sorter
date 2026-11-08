import { Fragment, createElement, useSyncExternalStore, type ReactNode } from 'react'

export type Lang = 'nn' | 'nb' | 'en'
export const LANGS: { id: Lang; label: string }[] = [
  { id: 'nn', label: 'Nynorsk' },
  { id: 'nb', label: 'Bokmål' },
  { id: 'en', label: 'English' },
]

/** A string, or singular/plural forms chosen by the `n` variable. */
type Text = string | { one: string; other: string }

const nn = {
  back: 'Tilbake',
  // My sets
  'mySets.title': 'Mine sett',
  'mySets.left': '{n} brikker att',
  'mySets.getStarted': 'Kom i gang',
  'mySets.getStartedText': 'Appen hentar brikkelister frå Rebrickable. Lag ein gratis API-nøkkel og legg han inn under innstillingar.',
  'mySets.addKey': 'Legg inn API-nøkkel',
  'mySets.empty': 'Ingen sett enno.',
  'mySets.emptyHint': 'Søk opp eit sett på namn eller nummer for å starte.',
  'mySets.add': 'Legg til sett',
  'mySets.unknownTheme': 'Ukjent tema',
  'mySets.noTag': 'Utan kategori',
  'mySets.setsN': '{n} sett',
  'mySets.select': 'Vel sett',
  'mySets.selectedN': '{n} valt',
  'mySets.selectAll': 'Vel alle',
  'mySets.selectNone': 'Fjern val',
  'mySets.selectGroup': 'Vel alle i {name}',
  'mySets.exitSelect': 'Avslutt val',
  'mySets.confirmResetN': 'Nullstille framdrifta for {n} sett?',
  'mySets.confirmDeleteN': 'Slette {n} sett og all framdrift?',
  'setGroup.theme': 'Tema',
  'setGroup.tag': 'Eigne kategoriar',
  'setGroup.none': 'Ingen',
  // Own categories
  'tags.menu': 'Eigne kategoriar …',
  'tags.title': 'Eigne kategoriar',
  'tags.help': 'Vel kva kategoriar settet høyrer til, eller lag ein ny. Eit sett kan vere i fleire.',
  'tags.none': 'Ingen kategoriar enno. Lag den første under.',
  'tags.new': 'Ny kategori, t.d. Bygd eller Til sal',
  'tags.add': 'Legg til',
  'tags.edit': 'Endre kategoriar',
  // Search
  'search.title': 'Legg til sett',
  'search.placeholder': 'Settnummer eller namn, t.d. 10270 eller Bookshop',
  'search.noHits': 'Ingen treff.',
  'search.parts': '{n} delar',
  'search.open': 'Opne',
  'search.add': 'Legg til',
  'search.starting': 'Startar …',
  'search.multi': 'Legg til fleire sett',
  'search.multiHint': 'Bli verande her etter at eit sett er lagt til',
  // Fetch progress
  'fetch.setInfo': 'Hentar settinfo …',
  'fetch.parts': 'Hentar brikker …',
  'fetch.partsN': 'Hentar brikker … {n}/{total}',
  'fetch.minifigs': 'Hentar minifigurar …',
  'fetch.minifigN': 'Hentar minifigur {i}/{total} …',
  'fetch.refetching': 'Hentar på nytt …',
  // Errors
  'err.noKey': 'Manglar API-nøkkel. Legg inn nøkkelen under Innstillingar.',
  'err.keyRejected': 'API-nøkkelen vart avvist av Rebrickable.',
  'err.notFound': 'Fann ikkje settet.',
  'err.status': 'Rebrickable svarte {status}.',
  'err.tooMany': 'For mange førespurnader. Prøv igjen om litt.',
  'err.badImport': 'Fila ser ikkje ut til å vere ein Brikkesjekk-eksport.',
  // Settings
  'settings.title': 'Innstillingar',
  'settings.apiKey': 'Rebrickable API-nøkkel',
  'settings.apiKeyHelp':
    'Brikkelistene kjem frå {rb}. Lag ein gratis konto, gå til {profile} → Settings → API og trykk «Generate new API key». Nøkkelen blir berre lagra på denne eininga.',
  'settings.profileLink': 'profilen din',
  'settings.keyPlaceholder': 'Lim inn nøkkelen',
  'settings.save': 'Lagre',
  'settings.keyOk': 'Nøkkelen fungerer og er lagra.',
  'settings.backup': 'Backup og flytting',
  'settings.backupText':
    'Alle sett og all framdrift ligg lokalt i nettlesaren. Eksporter til ei fil for backup, eller for å flytte til ei anna eining. Import slår saman med det som finst frå før.',
  'settings.export': 'Eksporter',
  'settings.import': 'Importer …',
  'settings.exported': 'Eksporterte {n} sett.',
  'settings.imported': 'Importerte {n} sett.',
  'settings.theme': 'Tema',
  'settings.themeAuto': 'System',
  'settings.themeLight': 'Lyst',
  'settings.themeDark': 'Mørkt',
  'settings.language': 'Språk',
  'settings.footer': 'Data frå Rebrickable. LEGO® er eit varemerke for LEGO Group, som ikkje står bak denne appen.',
  // Part row
  'part.aria': '{name}, {color}: {found} av {qty} funne. Trykk for å legge til éin.',
  'part.spare': 'Reserve',
  'part.oneLess': 'Éin færre',
  'part.oneMore': 'Éin til',
  'part.reset': 'Nullstill',
  'part.markAll': 'Merk alle som funne',
  // Set detail
  'set.notFound': 'Fann ikkje settet',
  'set.notFoundText': 'Settet er ikkje lagra på denne eininga.',
  'set.complete': 'Komplett',
  'set.allFound': 'alle {n} brikker funne',
  'set.leftOf': 'brikker att av {n}',
  'set.pctFound': '{p} % funne',
  'set.lotsDone': '{p} % · {a}/{b} typar ferdige',
  'set.menu': 'Innstillingar for settet',
  'set.instructions': 'Byggeinstruksjonar ↗',
  'set.refetch': 'Hent brikkeliste på nytt',
  'set.resetProgress': 'Nullstill framdrift',
  'set.delete': 'Slett sett',
  'set.confirmReset': 'Nullstille all framdrift for dette settet?',
  'set.confirmDelete': 'Slette {name} og all framdrift?',
  'set.cannotUndo': 'Dette kan ikkje angrast.',
  'set.resetBtn': 'Nullstill',
  'set.deleteBtn': 'Slett',
  cancel: 'Avbryt',
  'set.category': 'Kategori',
  'set.categoryN': 'Kategori {id}',
  'set.all': 'Alle',
  'set.group': 'Grupper',
  'set.spares': 'Reservedelar',
  'set.expandAll': 'Opne alle',
  'set.collapseAll': 'Lukk alle',
  'set.searchPart': 'Søk brikke',
  'set.refresh': 'Oppdater lista (fjern ferdige)',
  'set.colors': 'Fargar',
  'set.allColors': 'Alle fargar',
  'set.prev': 'Bla tilbake',
  'set.next': 'Bla fram',
  'set.allFoundTitle': 'Alle brikkene er funne 🎉',
  'set.isComplete': 'Settet er komplett.',
  'set.noMatch': 'Ingen brikker passar filteret.',
  'set.groupLeft': '{n} att',
  'set.groupLots': ' · {n} typar',
  'set.theSet': 'Settet',
  'set.minifig': 'Minifigur: {name}',
  'status.left': 'Att',
  'status.found': 'Funne',
  'status.all': 'Alle',
  'groupBy.color': 'Farge',
  'groupBy.category': 'Kategori',
  'groupBy.source': 'Sett / minifig',
  'groupBy.none': 'Ingen',
} satisfies Record<string, Text>

export type Key = keyof typeof nn
type Dict = Record<Key, Text>

const nb: Dict = {
  back: 'Tilbake',
  'mySets.title': 'Mine sett',
  'mySets.left': '{n} brikker igjen',
  'mySets.getStarted': 'Kom i gang',
  'mySets.getStartedText': 'Appen henter brikkelister fra Rebrickable. Lag en gratis API-nøkkel og legg den inn under innstillinger.',
  'mySets.addKey': 'Legg inn API-nøkkel',
  'mySets.empty': 'Ingen sett ennå.',
  'mySets.emptyHint': 'Søk opp et sett på navn eller nummer for å starte.',
  'mySets.add': 'Legg til sett',
  'mySets.unknownTheme': 'Ukjent tema',
  'mySets.noTag': 'Uten kategori',
  'mySets.setsN': '{n} sett',
  'mySets.select': 'Velg sett',
  'mySets.selectedN': '{n} valgt',
  'mySets.selectAll': 'Velg alle',
  'mySets.selectNone': 'Fjern valg',
  'mySets.selectGroup': 'Velg alle i {name}',
  'mySets.exitSelect': 'Avslutt valg',
  'mySets.confirmResetN': 'Nullstille fremdriften for {n} sett?',
  'mySets.confirmDeleteN': 'Slette {n} sett og all fremdrift?',
  'setGroup.theme': 'Tema',
  'setGroup.tag': 'Egne kategorier',
  'setGroup.none': 'Ingen',
  'tags.menu': 'Egne kategorier …',
  'tags.title': 'Egne kategorier',
  'tags.help': 'Velg hvilke kategorier settet hører til, eller lag en ny. Et sett kan være i flere.',
  'tags.none': 'Ingen kategorier ennå. Lag den første under.',
  'tags.new': 'Ny kategori, f.eks. Bygget eller Til salgs',
  'tags.add': 'Legg til',
  'tags.edit': 'Endre kategorier',
  'search.title': 'Legg til sett',
  'search.placeholder': 'Settnummer eller navn, f.eks. 10270 eller Bookshop',
  'search.noHits': 'Ingen treff.',
  'search.parts': '{n} deler',
  'search.open': 'Åpne',
  'search.add': 'Legg til',
  'search.starting': 'Starter …',
  'search.multi': 'Legg til flere sett',
  'search.multiHint': 'Bli værende her etter at et sett er lagt til',
  'fetch.setInfo': 'Henter settinfo …',
  'fetch.parts': 'Henter brikker …',
  'fetch.partsN': 'Henter brikker … {n}/{total}',
  'fetch.minifigs': 'Henter minifigurer …',
  'fetch.minifigN': 'Henter minifigur {i}/{total} …',
  'fetch.refetching': 'Henter på nytt …',
  'err.noKey': 'Mangler API-nøkkel. Legg inn nøkkelen under Innstillinger.',
  'err.keyRejected': 'API-nøkkelen ble avvist av Rebrickable.',
  'err.notFound': 'Fant ikke settet.',
  'err.status': 'Rebrickable svarte {status}.',
  'err.tooMany': 'For mange forespørsler. Prøv igjen om litt.',
  'err.badImport': 'Filen ser ikke ut til å være en Brikkesjekk-eksport.',
  'settings.title': 'Innstillinger',
  'settings.apiKey': 'Rebrickable API-nøkkel',
  'settings.apiKeyHelp':
    'Brikkelistene kommer fra {rb}. Lag en gratis konto, gå til {profile} → Settings → API og trykk «Generate new API key». Nøkkelen lagres kun på denne enheten.',
  'settings.profileLink': 'profilen din',
  'settings.keyPlaceholder': 'Lim inn nøkkelen',
  'settings.save': 'Lagre',
  'settings.keyOk': 'Nøkkelen fungerer og er lagret.',
  'settings.backup': 'Backup og flytting',
  'settings.backupText':
    'Alle sett og all fremdrift ligger lokalt i nettleseren. Eksporter til en fil for backup, eller for å flytte til en annen enhet. Import slås sammen med det som finnes fra før.',
  'settings.export': 'Eksporter',
  'settings.import': 'Importer …',
  'settings.exported': 'Eksporterte {n} sett.',
  'settings.imported': 'Importerte {n} sett.',
  'settings.theme': 'Tema',
  'settings.themeAuto': 'System',
  'settings.themeLight': 'Lyst',
  'settings.themeDark': 'Mørkt',
  'settings.language': 'Språk',
  'settings.footer': 'Data fra Rebrickable. LEGO® er et varemerke for LEGO Group, som ikke står bak denne appen.',
  'part.aria': '{name}, {color}: {found} av {qty} funnet. Trykk for å legge til én.',
  'part.spare': 'Reserve',
  'part.oneLess': 'Én færre',
  'part.oneMore': 'Én til',
  'part.reset': 'Nullstill',
  'part.markAll': 'Merk alle som funnet',
  'set.notFound': 'Fant ikke settet',
  'set.notFoundText': 'Settet er ikke lagret på denne enheten.',
  'set.complete': 'Komplett',
  'set.allFound': 'alle {n} brikker funnet',
  'set.leftOf': 'brikker igjen av {n}',
  'set.pctFound': '{p} % funnet',
  'set.lotsDone': '{p} % · {a}/{b} typer ferdige',
  'set.menu': 'Innstillinger for settet',
  'set.instructions': 'Byggeinstruksjoner ↗',
  'set.refetch': 'Hent brikkeliste på nytt',
  'set.resetProgress': 'Nullstill fremdrift',
  'set.delete': 'Slett sett',
  'set.confirmReset': 'Nullstille all fremdrift for dette settet?',
  'set.confirmDelete': 'Slette {name} og all fremdrift?',
  'set.cannotUndo': 'Dette kan ikke angres.',
  'set.resetBtn': 'Nullstill',
  'set.deleteBtn': 'Slett',
  cancel: 'Avbryt',
  'set.category': 'Kategori',
  'set.categoryN': 'Kategori {id}',
  'set.all': 'Alle',
  'set.group': 'Grupper',
  'set.spares': 'Reservedeler',
  'set.expandAll': 'Åpne alle',
  'set.collapseAll': 'Lukk alle',
  'set.searchPart': 'Søk brikke',
  'set.refresh': 'Oppdater listen (fjern ferdige)',
  'set.colors': 'Farger',
  'set.allColors': 'Alle farger',
  'set.prev': 'Bla tilbake',
  'set.next': 'Bla frem',
  'set.allFoundTitle': 'Alle brikkene er funnet 🎉',
  'set.isComplete': 'Settet er komplett.',
  'set.noMatch': 'Ingen brikker passer filteret.',
  'set.groupLeft': '{n} igjen',
  'set.groupLots': ' · {n} typer',
  'set.theSet': 'Settet',
  'set.minifig': 'Minifigur: {name}',
  'status.left': 'Igjen',
  'status.found': 'Funnet',
  'status.all': 'Alle',
  'groupBy.color': 'Farge',
  'groupBy.category': 'Kategori',
  'groupBy.source': 'Sett / minifig',
  'groupBy.none': 'Ingen',
}

const en: Dict = {
  back: 'Back',
  'mySets.title': 'My sets',
  'mySets.left': { one: '1 piece left', other: '{n} pieces left' },
  'mySets.getStarted': 'Get started',
  'mySets.getStartedText': 'The app fetches part lists from Rebrickable. Create a free API key and enter it in Settings.',
  'mySets.addKey': 'Add API key',
  'mySets.empty': 'No sets yet.',
  'mySets.emptyHint': 'Search for a set by name or number to get started.',
  'mySets.add': 'Add set',
  'mySets.unknownTheme': 'Unknown theme',
  'mySets.noTag': 'Uncategorized',
  'mySets.setsN': { one: '1 set', other: '{n} sets' },
  'mySets.select': 'Select sets',
  'mySets.selectedN': '{n} selected',
  'mySets.selectAll': 'Select all',
  'mySets.selectNone': 'Select none',
  'mySets.selectGroup': 'Select all in {name}',
  'mySets.exitSelect': 'Exit selection',
  'mySets.confirmResetN': { one: 'Reset progress for 1 set?', other: 'Reset progress for {n} sets?' },
  'mySets.confirmDeleteN': { one: 'Delete 1 set and all its progress?', other: 'Delete {n} sets and all their progress?' },
  'setGroup.theme': 'Theme',
  'setGroup.tag': 'My categories',
  'setGroup.none': 'None',
  'tags.menu': 'My categories …',
  'tags.title': 'My categories',
  'tags.help': 'Choose which categories this set belongs to, or create a new one. A set can be in several.',
  'tags.none': 'No categories yet. Create the first one below.',
  'tags.new': 'New category, e.g. Built or For sale',
  'tags.add': 'Add',
  'tags.edit': 'Edit categories',
  'search.title': 'Add set',
  'search.placeholder': 'Set number or name, e.g. 10270 or Bookshop',
  'search.noHits': 'No results.',
  'search.parts': { one: '1 part', other: '{n} parts' },
  'search.open': 'Open',
  'search.add': 'Add',
  'search.starting': 'Starting …',
  'search.multi': 'Add several sets',
  'search.multiHint': 'Stay here after a set is added',
  'fetch.setInfo': 'Fetching set info …',
  'fetch.parts': 'Fetching parts …',
  'fetch.partsN': 'Fetching parts … {n}/{total}',
  'fetch.minifigs': 'Fetching minifigures …',
  'fetch.minifigN': 'Fetching minifigure {i}/{total} …',
  'fetch.refetching': 'Refetching …',
  'err.noKey': 'Missing API key. Add it in Settings.',
  'err.keyRejected': 'Rebrickable rejected the API key.',
  'err.notFound': 'Set not found.',
  'err.status': 'Rebrickable responded with {status}.',
  'err.tooMany': 'Too many requests. Try again in a moment.',
  'err.badImport': "This file doesn't look like a Brikkesjekk export.",
  'settings.title': 'Settings',
  'settings.apiKey': 'Rebrickable API key',
  'settings.apiKeyHelp':
    'Part lists come from {rb}. Create a free account, go to {profile} → Settings → API and click “Generate new API key”. The key is only stored on this device.',
  'settings.profileLink': 'your profile',
  'settings.keyPlaceholder': 'Paste the key',
  'settings.save': 'Save',
  'settings.keyOk': 'The key works and has been saved.',
  'settings.backup': 'Backup and transfer',
  'settings.backupText':
    'All sets and progress are stored locally in the browser. Export to a file for backup, or to move to another device. Importing merges with what is already there.',
  'settings.export': 'Export',
  'settings.import': 'Import …',
  'settings.exported': { one: 'Exported 1 set.', other: 'Exported {n} sets.' },
  'settings.imported': { one: 'Imported 1 set.', other: 'Imported {n} sets.' },
  'settings.theme': 'Theme',
  'settings.themeAuto': 'System',
  'settings.themeLight': 'Light',
  'settings.themeDark': 'Dark',
  'settings.language': 'Language',
  'settings.footer': 'Data from Rebrickable. LEGO® is a trademark of the LEGO Group, which does not sponsor or endorse this app.',
  'part.aria': '{name}, {color}: {found} of {qty} found. Tap to add one.',
  'part.spare': 'Spare',
  'part.oneLess': 'One fewer',
  'part.oneMore': 'One more',
  'part.reset': 'Reset',
  'part.markAll': 'Mark all as found',
  'set.notFound': 'Set not found',
  'set.notFoundText': "This set isn't saved on this device.",
  'set.complete': 'Complete',
  'set.allFound': 'all {n} pieces found',
  'set.leftOf': 'of {n} pieces left',
  'set.pctFound': '{p}% found',
  'set.lotsDone': '{p}% · {a}/{b} lots done',
  'set.menu': 'Set options',
  'set.instructions': 'Building instructions ↗',
  'set.refetch': 'Refetch part list',
  'set.resetProgress': 'Reset progress',
  'set.delete': 'Delete set',
  'set.confirmReset': 'Reset all progress for this set?',
  'set.confirmDelete': 'Delete {name} and all progress?',
  'set.cannotUndo': 'This cannot be undone.',
  'set.resetBtn': 'Reset',
  'set.deleteBtn': 'Delete',
  cancel: 'Cancel',
  'set.category': 'Category',
  'set.categoryN': 'Category {id}',
  'set.all': 'All',
  'set.group': 'Group',
  'set.spares': 'Spare parts',
  'set.expandAll': 'Expand all',
  'set.collapseAll': 'Collapse all',
  'set.searchPart': 'Search parts',
  'set.refresh': 'Refresh list (hide completed)',
  'set.colors': 'Colors',
  'set.allColors': 'All colors',
  'set.prev': 'Scroll back',
  'set.next': 'Scroll forward',
  'set.allFoundTitle': 'All pieces found 🎉',
  'set.isComplete': 'The set is complete.',
  'set.noMatch': 'No pieces match the filter.',
  'set.groupLeft': '{n} left',
  'set.groupLots': { one: ' · 1 lot', other: ' · {n} lots' },
  'set.theSet': 'The set',
  'set.minifig': 'Minifigure: {name}',
  'status.left': 'Left',
  'status.found': 'Found',
  'status.all': 'All',
  'groupBy.color': 'Color',
  'groupBy.category': 'Category',
  'groupBy.source': 'Set / minifig',
  'groupBy.none': 'None',
}

const DICTS: Record<Lang, Dict> = { nn, nb, en }
const STORAGE_KEY = 'bs.lang'

function load(): Lang {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as unknown
    if (raw === 'nn' || raw === 'nb' || raw === 'en') return raw
  } catch {
    /* ignore */
  }
  return 'nn'
}

let lang: Lang = load()
const listeners = new Set<() => void>()
document.documentElement.lang = lang

export function getLang() {
  return lang
}

export function setLang(next: Lang) {
  if (next === lang) return
  lang = next
  document.documentElement.lang = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    /* ignore */
  }
  listeners.forEach((fn) => fn())
}

function subscribe(fn: () => void) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Re-render the calling component when the language changes. */
export function useLang() {
  return useSyncExternalStore(subscribe, getLang)
}

type Vars = Record<string, string | number>

function pick(key: Key, vars?: Vars) {
  const text = DICTS[lang][key]
  return typeof text === 'string' ? text : vars?.n === 1 ? text.one : text.other
}

/** Translate `key` into the current language, filling `{var}` placeholders. */
export function t(key: Key, vars?: Vars): string {
  return pick(key, vars).replace(/\{(\w+)\}/g, (m, k: string) => (vars && k in vars ? String(vars[k]) : m))
}

/** Like `t`, but placeholders can be React nodes (e.g. links). */
export function tNode(key: Key, nodes: Record<string, ReactNode>): ReactNode {
  const parts = pick(key).split(/\{(\w+)\}/g)
  return parts.map((p, i) => createElement(Fragment, { key: i }, i % 2 ? (nodes[p] ?? `{${p}}`) : p))
}
