import * as React from "react"

type Tone = "neutral" | "info" | "success" | "warning" | "danger"

function Badge({ tone = "neutral", children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span data-kit="badge" data-tone={tone}>
      {children}
    </span>
  )
}

export { Badge }
