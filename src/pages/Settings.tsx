import { useEffect, useRef, useState } from 'react'
import { getApiKey, saveApiKey, testKey } from '../api/rebrickable'
import { exportAll, importAll, type ExportFile } from '../db'
import { Header } from '../components/Header'

export type Theme = 'auto' | 'light' | 'dark'

export function Settings({ theme, setTheme, onKeyChange }: { theme: Theme; setTheme: (t: Theme) => void; onKeyChange: () => void }) {
  const [key, setKey] = useState('')
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const [dataMsg, setDataMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void getApiKey().then(setKey)
  }, [])

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setTesting(true)
    setKeyMsg(null)
    try {
      await testKey(key)
      await saveApiKey(key)
      setKeyMsg({ ok: true, text: 'Nøkkelen fungerer og er lagra.' })
      onKeyChange()
    } catch (err) {
      setKeyMsg({ ok: false, text: (err as Error).message })
    } finally {
      setTesting(false)
    }
  }

  async function doExport() {
    const data = await exportAll()
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `brikkesjekk-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000)
    setDataMsg({ ok: true, text: `Eksporterte ${data.sets.length} sett.` })
  }

  async function doImport(file: File) {
    try {
      const n = await importAll(JSON.parse(await file.text()) as ExportFile)
      setDataMsg({ ok: true, text: `Importerte ${n} sett.` })
    } catch (err) {
      setDataMsg({ ok: false, text: (err as Error).message })
    }
  }

  return (
    <>
      <Header title="Innstillingar" back="#/" />
      <main className="page narrow">
        <section className="card">
          <h2>Rebrickable API-nøkkel</h2>
          <p className="muted small">
            Brikkelistene kjem frå <a href="https://rebrickable.com" target="_blank" rel="noreferrer">Rebrickable</a>. Lag ein gratis
            konto, gå til <a href="https://rebrickable.com/users/profile/" target="_blank" rel="noreferrer">profilen din</a> → Settings →
            API og trykk «Generate new API key». Nøkkelen blir berre lagra på denne eininga.
          </p>
          <form onSubmit={save} className="row">
            <input
              className="input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="Lim inn nøkkelen"
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn primary" disabled={!key.trim() || testing}>
              {testing ? <span className="spinner" /> : 'Lagre'}
            </button>
          </form>
          {keyMsg && <p className={keyMsg.ok ? 'ok small' : 'error'}>{keyMsg.text}</p>}
        </section>

        <section className="card">
          <h2>Backup og flytting</h2>
          <p className="muted small">
            Alle sett og all framdrift ligg lokalt i nettlesaren. Eksporter til ei fil for backup, eller for å flytte til ein annan
            eining. Import slår saman med det som finst frå før.
          </p>
          <div className="row">
            <button className="btn" onClick={doExport}>
              Eksporter
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              Importer …
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void doImport(f)
                e.target.value = ''
              }}
            />
          </div>
          {dataMsg && <p className={dataMsg.ok ? 'ok small' : 'error'}>{dataMsg.text}</p>}
        </section>

        <section className="card">
          <h2>Tema</h2>
          <div className="segmented">
            {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
              <button key={t} className={theme === t ? 'on' : ''} onClick={() => setTheme(t)}>
                {t === 'auto' ? 'System' : t === 'light' ? 'Lyst' : 'Mørkt'}
              </button>
            ))}
          </div>
        </section>

        <p className="muted small center">Data frå Rebrickable. LEGO® er eit varemerke for LEGO Group, som ikkje står bak denne appen.</p>
      </main>
    </>
  )
}
