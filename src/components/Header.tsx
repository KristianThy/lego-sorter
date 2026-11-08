import type { ReactNode } from 'react'
import { Icon } from './Icon'

export function Header({ title, sub, back, actions }: { title: ReactNode; sub?: ReactNode; back?: string; actions?: ReactNode }) {
  return (
    <header className="header">
      {back && (
        <a className="icon-btn" href={back} aria-label="Tilbake">
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
