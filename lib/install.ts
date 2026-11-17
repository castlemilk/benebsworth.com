import { installBlockCaret } from "@/lib/block-caret"
import { installHaptics } from "@/lib/haptics"
import { installInputModality } from "@/lib/input-modality"
import { installSafariTabbing } from "@/lib/safari-tabbing"
import { installSound } from "@/lib/sound"

// The page-wide behaviors the skin relies on: the block caret, haptics and
// sounds, keyboard-only focus rings and Safari's Tab order. Each listens at
// the document, so they're installed once, however many roots there are.
let installed = false

function installHardware() {
  if (installed || typeof document === "undefined") return
  installed = true
  installBlockCaret()
  installHaptics()
  installSound()
  installSafariTabbing()
  installInputModality()
}

export { installHardware }
