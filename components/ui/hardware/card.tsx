import * as React from "react"

function Card({
  title,
  description,
  action,
  children,
  footer,
}: {
  title: string
  description?: string
  action?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <section data-kit="card" aria-label={title}>
      <header data-kit="card-header">
        <div>
          <h3 data-kit="card-title">{title}</h3>
          {description && <p data-kit="card-description">{description}</p>}
        </div>
        {action}
      </header>
      <div data-kit="card-body">{children}</div>
      {footer && <footer data-kit="card-footer">{footer}</footer>}
    </section>
  )
}

export { Card }
