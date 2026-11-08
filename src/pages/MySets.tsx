import { useLiveQuery } from 'dexie-react-hooks'
import { db, type LegoSet } from '../db'
import { Header } from '../components/Header'
import { Icon } from '../components/Icon'
import { ProgressRing } from '../components/ProgressRing'
import { setHref } from '../router'
import { computeStats, progressMap } from '../stats'
import { t, useLang } from '../i18n'

function SetCard({ set }: { set: LegoSet }) {
  useLang()
  const stats = useLiveQuery(async () => {
    const [parts, prog] = await Promise.all([
      db.parts.where('setNum').equals(set.setNum).toArray(),
      db.progress.where('setNum').equals(set.setNum).toArray(),
    ])
    return computeStats(parts, progressMap(prog))
  }, [set.setNum])
  const value = stats && stats.total ? stats.found / stats.total : 0
  const left = stats ? stats.total - stats.found : 0
  return (
    <a className="set-card" href={setHref(set.setNum)}>
      <div className="set-thumb">{set.imgUrl ? <img src={set.imgUrl} alt="" loading="lazy" /> : null}</div>
      <div className="set-info">
        <strong className="clamp">{set.name}</strong>
        <span className="muted small">
          {set.setNum} · {set.year}
        </span>
        <span className="small">
          {stats ? (left === 0 ? <span className="ok">{t('set.complete')}</span> : t('mySets.left', { n: left })) : '…'}
        </span>
      </div>
      <ProgressRing value={value} />
    </a>
  )
}

export function MySets({ hasKey }: { hasKey: boolean }) {
  useLang()
  const sets = useLiveQuery(() => db.sets.orderBy('lastOpenedAt').reverse().toArray(), [])
  return (
    <>
      <Header
        title={t('mySets.title')}
        actions={
          <a className="icon-btn" href="#/settings" aria-label={t('settings.title')}>
            <Icon name="settings" />
          </a>
        }
      />
      <main className="page">
        {!hasKey && (
          <div className="callout">
            <strong>{t('mySets.getStarted')}</strong>
            <p className="muted">{t('mySets.getStartedText')}</p>
            <a className="btn primary" href="#/settings">
              {t('mySets.addKey')}
            </a>
          </div>
        )}
        {sets && sets.length === 0 && hasKey && (
          <div className="empty">
            <p>{t('mySets.empty')}</p>
            <p className="muted small">{t('mySets.emptyHint')}</p>
          </div>
        )}
        <div className="set-list">{sets?.map((s) => <SetCard key={s.setNum} set={s} />)}</div>
      </main>
      {hasKey && (
        <a className="fab" href="#/search">
          <Icon name="plus" /> {t('mySets.add')}
        </a>
      )}
    </>
  )
}
