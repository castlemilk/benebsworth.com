# Review evidence and remaining acceptance

## Evidence status

| Evidence | Status | Scope |
| --- | --- | --- |
| Source inspection | Completed | Pinned repository and canonical Space records; dirty Mac drafts not accessible |
| Motion utility | 18 tests passed | Mock platform lifecycle, restrictions and target validation |
| DOM adapter | 11 tests passed | JSDOM URL/focus-node policy, context retention, persisted remount and fallback |
| Fixtures and HTTP | 9 tests passed | Source identity, query bounds/escaping, native action policy, live loopback HTTP |
| Colour and CSS contract | 2 tests passed | Declared palette ratios and scoped source rules |
| Scoped lint | Passed | Zero errors/warnings in this workbench |
| Browser suite discovery | Passed | 18 cases listed, no browser launched |
| Actual browser rendering | Blocked | Local Browser request timed out; cloud preview connection refused; subsequent error-page access rejected by URL policy |
| Physical touch/hybrid and assistive technology | Unverified | No device or screen-reader session |
| Full-site build/CI | Separate gate | No production import or route; not inferred from standalone tests |
| Deployment | Not performed | Draft-only source handoff |

## Source critique and corrections

An independent source review was performed without browser screenshots. Findings and corrections are bounded to this folder:

1. **Stale comparison links:** enhancement/no-JS/failure links originally retained the first request's query. They now recompute from the current URL and preserve selection/filter/motion state. A DOM regression covers the handoff.
2. **Insufficient input-boundary contrast:** initial editorial-rule colours yielded 1.9506:1 light and 2.9389:1 dark against their declared surfaces. Separate scoped control-border colours now pass ≥3:1 in both themes; text/focus palette checks also pass. This is numeric source evidence, not rendered acceptance.
3. **Pointer target movement on focusout:** an excluded focus-context row was initially removed in a microtask after focus left. It is now retained for the current route state, preventing that source-inferred pointerdown/pointerup layout risk. The regression confirms focusout alone does not remove it. Physical click behaviour remains a browser gate.

Additional source review settled old effects on every `popstate` and added `pagehide` disposal plus persisted `pageshow` remount. A final review found that remounting could lose a previously retained, now-unfocused context row; a document-scoped in-memory snapshot now preserves it on return to the same URL. Tests verify that row retention, no replay and a single handler set. These are model tests, not BFCache certification.

## Required consuming-browser pass

Record exact commit, route/query, viewport, theme, input method and artifact path for every case. Review composition before reading automated pass results. Compare the first viewport, a complete interaction/reading sequence and a full-page view against the selected editorial folio. No actual captures exist for this revision yet.

| Case | Falsifiable acceptance | Current status |
| --- | --- | --- |
| Desktop pointer | Inspect repeatedly; last source wins immediately, no stale cue/content, no shifted click target | Source-tested; rendering unverified |
| Keyboard | Tab/Shift+Tab, Enter on links, native Space/Enter controls, visible focus independent of inspection; no trap | DOM policy tested; browser/AT unverified |
| Narrow and short viewport | At 390×844 and 320×740, long titles and all controls reflow without horizontal page overflow; explicit details action remains reachable | Prepared test; unexecuted |
| Browser zoom | 200% zoom and 320 CSS-pixel equivalent reflow preserve reading, controls and visible focus | Manual case; unverified |
| Touch/hybrid | Essential controls remain visible without hover, native vertical scroll works, targets do not relocate between touchstart and activation | Manual device case; unverified |
| Reduced motion | Load reduced, change the preference during an effect, toggle back; final content stays visible and no old effect replays | Utility tested; browser preference/rendering unverified |
| Forced colours | Native control borders, focus outline and explicit inspected text survive; no meaning depends on a decorative image | Source-tested; rendered case unexecuted |
| Filter recovery | Valid zero differs from waiting/unavailable; Clear and Retry work; context is retained and input focus is not stolen | DOM/HTTP tested; announcement unverified |
| Native destinations | Modified inspection click opens a complete server-rendered query; actual source/evidence links keep their destinations | Link policy tested; native browser case unverified |
| History and reading | Select/filter, scroll beyond a fragment, read the local document, Back/Forward, reload direct query; no extra history or forced hash scroll | DOM policy tested; native restoration unverified |
| No JS | Disable JavaScript in an authorised browser; forms and inspection links resolve the same query through the review server | HTTP tested; browser case unexecuted |
| Failed enhancement | 503 module response keeps links/GET forms/selected source usable | HTTP tested; browser case unexecuted |
| Teardown/BFCache | Navigate away during cue, Back, repeat; no stale listener, missing interaction or replay | DOM lifecycle tested; real cache behaviour unverified |
| Screen reader | Names/landmarks/status updates are useful without announcing the whole inspector; selected/focused/root distinctions are understandable | Semantics source-reviewed; AT unverified |

The prepared browser suite covers a subset of this matrix. It does not claim physical touch, native IME, screen-reader, zoom or all-browser support. Responsive width assertions do not establish artistic alignment. Retain these gaps until the corresponding evidence exists.

## Integration decision

Keep the branch and PR in draft. Graph views can review `CONTRACT.md` and adopt only the small feedback primitive after checking its real consumer. Design can review the scoped focus/selection treatments without copying local specimen tokens into global styles. InteractiveStudy remains the guide authority. Publication, production imports, source-model changes and the Mac owner files require their existing owners' integration work.
