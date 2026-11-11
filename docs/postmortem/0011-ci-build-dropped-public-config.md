# 0011 — Hike photos vanished when production moved to a CI build

**Executive summary.** Hike galleries, trail-guide photos and the /admin image
console read their bucket from `NEXT_PUBLIC_HIKE_*` and
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, which Next bakes into the JS at build time. Those
values only ever lived in the local `.env`. When production moved to the checked
GitHub Actions publish, the build ran without them, so it compiled cleanly and
shipped pages that never request a manifest. Nothing errored and every check
passed. The publish workflow now requires the values and confirms that the built
JS contains them.

## Timeline

- **2026-07-03** (`6f905d3`) — the admin config reads the bucket from
  `NEXT_PUBLIC_HIKE_*`, with `''` as the fallback. Builds from a laptop pick
  the values up from `.env`.
- **2026-11-10** (`a0b0aa8`) — `publish-site.yml` adds the CI publish path. It
  passes `NEXT_PUBLIC_GA_MEASUREMENT_ID` and nothing else public.
  Cloudflare `e113dd23`, the last laptop build, still fetches manifests.
- **2026-11-11** — the first CI publishes (`24803971`, `a9d124a`, `eaf7779`)
  serve hike pages with zero bucket photos and no manifest request.
- **2026-11-12** — found while chasing the blog-gallery console 404s: production
  made no request at all, so the console was quiet.

## Root cause

A public build variable can be unset without failing anything. `?? ''` turns a
missing value into "feature not configured", and the components treat that as
"render nothing". The variables were set by an ignored local file, not by
anything the release path declared, so moving the build to a clean runner
silently removed them. The browser tests ran against the same unconfigured
export, where an empty gallery is a valid state.

## Guardrails

- The GitHub `Production` environment holds `NEXT_PUBLIC_HIKE_BUCKET`,
  `NEXT_PUBLIC_HIKE_PUBLIC_BASE` and `NEXT_PUBLIC_GOOGLE_CLIENT_ID` as variables.
  They are public values, compiled into the client bundle.
- `.github/workflows/publish-site.yml`, "Validate explicit release request":
  refuses to start without the three values in the expected shapes. The base
  must be `https://storage.googleapis.com/<bucket>`.
- `.github/workflows/publish-site.yml`, "Confirm the export carries its public
  client config": after `task remote:check`, fails if the built JS lacks the
  bucket base or client ID, or the export lacks the GA ID.
- Known gap: PR builds in `site-checks.yml` still run unconfigured, so e2e
  never exercises a live gallery. A new `NEXT_PUBLIC_*` read is only guarded
  once someone adds it to both workflow lists.
