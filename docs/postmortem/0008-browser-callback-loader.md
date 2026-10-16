# 0008 — The fixture runner hid a browser callback serialization error

**Executive summary.** A staging-only grading pass gave both agents' racers
27/100 because every behavioural check threw `__name is not defined`. The
check callback captured a helper introduced by tsx, not by the generated game.
The Vitest fixture transform did not introduce that helper, so its tests passed.

## Evidence and correction

- On 2026-09-22, grading run `2026-09-22T11-18-45-astra-devin-final` exposed
  the same exception in all 24 racer checks. Despite its provisional name,
  that pass was never merged into the board or published.
- The `car()` browser callback declared a local function. tsx's name-preserving
  transform inserted a reference to its module-level `__name` helper.
  Playwright serialized the callback without that surrounding module.
- The callback now reads its three attributes directly, with no named nested
  function and no change to the requested telemetry or point budgets.
- A new fixture invokes the real tsx CLI as a child process. It reproduced
  the failure before the correction, supplementing the existing Vitest cases.

The same audit found 700 ms click deadlines expiring on Astra's rendered
WebGL lighthouse controls. The new tasks now allow five seconds for control
actions and screenshots, within the existing 20-second check and 90-second
batch budgets. Final offline grading serializes artifacts so multiple WebGL
scenes do not compete for the renderer. The rescore trace records this
concurrency setting. The same procedure applies to every pair from both agents.

No generated source is repaired and no generation is replaced. Devin's final
lighthouse generation timeout remains a failed attempt. All published scores
must come from a new common grading pass after these corrections are committed.

## Guardrails

- `plugins/visual-games/checks.test.ts`: the working racer must earn 100
  behavioural points through both Vitest and the actual sweep's tsx loader.
- `task bench:visual-games-fixtures`: working, static, missing-control and
  WebGL capture fixtures remain part of the explicit browser verification.
- Inspect per-check exceptions before publishing a score. A low number alone
  cannot distinguish a broken artifact from a broken observer.
