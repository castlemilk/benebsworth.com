// @vitest-environment jsdom
import { render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { SpringSwitch } from "./SpringSwitch"

describe("SpringSwitch", () => {
  it("exposes role=switch with aria state and toggles via onChange", () => {
    const onChange = vi.fn()
    render(<SpringSwitch checked label="blog 97" onChange={onChange} />)
    const sw = screen.getByRole("switch", { name: "blog 97" })
    expect(sw.getAttribute("aria-checked")).toBe("true")
    sw.click()
    expect(onChange).toHaveBeenCalledWith(false)
  })
})
