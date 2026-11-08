import { useEffect, useRef, useState } from 'react'
import { getApiKey, saveApiKey, testKey } from '../api/rebrickable'
import { exportAll, importAll, type ExportFile } from '../db'
import { Header } from '../components/Header'
import { LANGS, setLang, t, tNode, useLang } from '../i18n'

export type Theme = 'auto' | 'light' | 'dark'

export function Settings({ theme, setTheme, onKeyChange }: { theme: Theme; setTheme: (t: Theme) => void; onKeyChange: () => void }) {
  const lang = useLang()
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
      setKeyMsg({ ok: true, text: t('settings.keyOk') })
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
    setDataMsg({ ok: true, text: t('settings.exported', { n: data.sets.length }) })
  }

  async function doImport(file: File) {
    try {
      const n = await importAll(JSON.parse(await file.text()) as ExportFile)
      setDataMsg({ ok: true, text: t('settings.imported', { n }) })
    } catch (err) {
      setDataMsg({ ok: false, text: (err as Error).message })
    }
  }

  return (
    <>
      <Header title={t('settings.title')} back="#/" />
      <main className="page narrow">
        <section className="card">
          <h2>{t('settings.apiKey')}</h2>
          <p className="muted small">
            {tNode('settings.apiKeyHelp', {
              rb: (
                <a href="https://rebrickable.com" target="_blank" rel="noreferrer">
                  Rebrickable
                </a>
              ),
              profile: (
                <a href="https://rebrickable.com/users/profile/" target="_blank" rel="noreferrer">
                  {t('settings.profileLink')}
                </a>
              ),
            })}
          </p>
          <form onSubmit={save} className="row">
            <input
              className="input"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder={t('settings.keyPlaceholder')}
              autoComplete="off"
              spellCheck={false}
            />
            <button className="btn primary" disabled={!key.trim() || testing}>
              {testing ? <span className="spinner" /> : t('settings.save')}
            </button>
          </form>
          {keyMsg && <p className={keyMsg.ok ? 'ok small' : 'error'}>{keyMsg.text}</p>}
        </section>

        <section className="card">
          <h2>{t('settings.backup')}</h2>
          <p className="muted small">{t('settings.backupText')}</p>
          <div className="row">
            <button className="btn" onClick={doExport}>
              {t('settings.export')}
            </button>
            <button className="btn" onClick={() => fileRef.current?.click()}>
              {t('settings.import')}
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
          <h2>{t('settings.language')}</h2>
          <div className="segmented">
            {LANGS.map((l) => (
              <button key={l.id} className={lang === l.id ? 'on' : ''} onClick={() => setLang(l.id)} lang={l.id}>
                {l.label}
              </button>
            ))}
          </div>
        </section>

        <section className="card">
          <h2>{t('settings.theme')}</h2>
          <div className="segmented">
            {(['auto', 'light', 'dark'] as Theme[]).map((th) => (
              <button key={th} className={theme === th ? 'on' : ''} onClick={() => setTheme(th)}>
                {th === 'auto' ? t('settings.themeAuto') : th === 'light' ? t('settings.themeLight') : t('settings.themeDark')}
              </button>
            ))}
          </div>
        </section>

        <p className="muted small center">{t('settings.footer')}</p>
      </main>
    </>
  )
}
