
function Breadcrumb({ items }: { items: string[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol data-kit="breadcrumb">
        {items.map((item, index) => (
          <li key={item}>
            {index === items.length - 1 ? (
              <span data-kit="breadcrumb-current" aria-current="page">
                {item}
              </span>
            ) : (
              <a data-kit="breadcrumb-link" tabIndex={0}>
                {item}
              </a>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export { Breadcrumb }
