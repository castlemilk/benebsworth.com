# Build-only OpenGraph fallback fonts

Unmodified local copies of Noto Sans Regular, Noto Sans Symbols Regular and
Noto Sans Symbols 2 Regular from the development environment's installed
`fonts-noto-core` package (font files dated 26 December 2020). No network
retrieval was used. `LICENSE` retains the package's copyright and OFL-1.1 terms.

These are fallback fonts only. `lib/og-fonts.ts` retains the installed Next.js
package's **same bundled Geist Regular** as the first font, preserving ordinary
OG typography. Noto covers authored Greek and category symbols that otherwise
trigger next/og's automatic remote fallback. Keep these outside `public/`;
they are build inputs, not browser font downloads. Browser editorial fonts
remain unchanged.

Tests render real route metadata with fetch intercepted and rejected. When
adding a new writing system or emoji, extend licensed local coverage deliberately
and rerun those tests; Next's automatic network fallback is not an acceptable
way to make an offline build pass. No font-fetch security rules are changed.
