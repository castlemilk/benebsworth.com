export default function Loading() {
  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-6xl px-6 pb-32 pt-32 sm:px-8"
    >
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-surface-2" />
        <div className="h-14 w-3/4 animate-pulse rounded-lg bg-surface-2" />
        <div className="h-6 w-full animate-pulse rounded bg-surface-2" />
        <div className="h-6 w-5/6 animate-pulse rounded bg-surface-2" />
      </div>
    </main>
  )
}
