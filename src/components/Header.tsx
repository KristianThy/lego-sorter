import type { ReactNode } from 'react'
import { Icon } from './Icon'
import { t, useLang } from '../i18n'

export function Header({ title, sub, back, actions }: { title: ReactNode; sub?: ReactNode; back?: string; actions?: ReactNode }) {
  useLang()
  return (
    <header className="header">
      {back && (
        <a className="icon-btn" href={back} aria-label={t('back')}>
          <Icon name="back" />
        </a>
      )}
      <div className="header-title">
        <h1>{title}</h1>
        {sub && <p className="muted small">{sub}</p>}
      </div>
      <div className="header-actions">{actions}</div>
    </header>
  )
}
