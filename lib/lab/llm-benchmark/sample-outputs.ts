// Sample / placeholder generated outputs for the LLM benchmark.
// In a real harness these come from the model APIs; these are here so the
// side-by-side output UI has something to render while API runners are wired.

export const SAMPLE_OUTPUTS: Record<string, Record<string, string>> = {
  'equation-solver': {
    'claude-4': `We need to solve over the reals:
  x² + y² = 25
  xy     = 12

Let s = x + y and p = xy = 12. Then
  x² + y² = (x + y)² − 2xy = s² − 2p = s² − 24.
So s² − 24 = 25 ⇒ s² = 49 ⇒ s = 7 or s = −7.

For a fixed s, x and y are roots of t² − st + p = 0.

Case s = 7: t² − 7t + 12 = 0 ⇒ (t − 3)(t − 4) = 0 ⇒ {x, y} = {3, 4}.
Case s = −7: t² + 7t + 12 = 0 ⇒ (t + 3)(t + 4) = 0 ⇒ {x, y} = {−3, −4}.

Therefore the solution pairs are (3, 4), (4, 3), (−3, −4), (−4, −3).`,
    'gpt-5': `From xy = 12 we get y = 12/x (x ≠ 0). Substitute into x² + y² = 25:
  x² + (12/x)² = 25
  x² + 144/x² = 25
Multiply by x²: x⁴ − 25x² + 144 = 0.
Let u = x²: u² − 25u + 144 = 0 ⇒ (u − 9)(u − 16) = 0 ⇒ u = 9 or u = 16.
So x = ±3 or x = ±4.

If x = 3, y = 4; if x = 4, y = 3.
If x = −3, y = −4; if x = −4, y = −3.

Solutions: (3,4), (4,3), (−3,−4), (−4,−3).`,
    'gemini-2.5-pro': `Observe that x² + y² = 25 describes a circle of radius 5 and xy = 12 describes a hyperbola.

Use the identity (x + y)² = x² + 2xy + y² = 25 + 24 = 49, so x + y = ±7.
Similarly (x − y)² = x² − 2xy + y² = 25 − 24 = 1, so x − y = ±1.

Solving the linear systems:
  x + y = 7,  x − y = 1  → x = 4, y = 3
  x + y = 7,  x − y = −1 → x = 3, y = 4
  x + y = −7, x − y = 1  → x = −3, y = −4
  x + y = −7, x − y = −1 → x = −4, y = −3

Final answer: (3,4), (4,3), (−3,−4), (−4,−3).`,
    'kimi-k2.7': `System:
  x² + y² = 25
  xy = 12

Square the second equation: x²y² = 144.
Let a = x², b = y². Then a + b = 25 and ab = 144.
So a and b are roots of z² − 25z + 144 = 0 ⇒ (z − 9)(z − 16) = 0.
Thus {x², y²} = {9, 16}, giving |x|, |y| ∈ {3, 4}.

Since xy = 12 > 0, x and y have the same sign.
Positive case: (3,4) and (4,3).
Negative case: (−3,−4) and (−4,−3).

All real solutions: (3,4), (4,3), (−3,−4), (−4,−3).`,
  },
}
