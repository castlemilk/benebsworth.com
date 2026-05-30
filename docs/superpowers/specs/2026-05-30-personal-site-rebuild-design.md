# Personal Site Rebuild — Design

**Date:** 2026-05-30
**Author:** Ben Ebsworth (with Claude)
**Status:** Approved design → ready for implementation plan

## Overview

Replace the existing Gatsby personal site (`benebsworth.com`) with a new, lightweight,
fully-static Next.js site. The centrepiece is an animated landing page: a responsive grid
that packs the three nav words (BLOG · PROJECT · ABOUT) into staircase paths and fills the
remaining cells with shuffled "artifact" tiles that deep-link into the site. The old Gatsby
site is preserved and served as a read-only archive at `/archive` "for fun". Deployment is
Terraform-managed S3 + CloudFront, mirroring the previous hosting region/setup.

## Goals

- Beautiful, distinctive, performant landing page with the grid/snake animation.
- Three content sections: **projects**, **blog**, **about**, built from the existing content.
- Old Gatsby site reachable at `benebsworth.com/archive/`.
- Static hosting on S3 + CloudFront, provisioned with Terraform.
- Lightweight: minimal JS, no heavyweight animation framework on the landing.

## Non-Goals

- No CMS, server runtime, or dynamic backend (fully static export).
- No redesign of the *archived* Gatsby site (served as-is, just re-based to `/archive`).
- No new blog content as part of this work (migrate existing posts only).

## Decisions (locked)

| Topic | Decision |
|-------|----------|
| Framework | Next.js (latest, App Router, React 19), `output: 'export'` (static) |
| Language | TypeScript |
| UI components | **shadcn/ui** + Tailwind for section pages (per global rule) |
| Landing animation | Custom SVG + Web Animations API (no animation library) |
| Data models | **Protobuf** (`content.proto`) → generated TS types (build-time only) |
| Content format | MDX with frontmatter |
| Aesthetic | Dark, monospace, neon accents (blog `#00e0b8`, project `#7c5cff`, about `#ff7a59`) |
| Landing grid | Responsive **4×5 (portrait) ↔ 5×4 (landscape)**; words read strictly →/↓; gaps = artifact tiles |
| Archive | Subpath `/archive` — old Gatsby rebuilt with `pathPrefix=/archive` |
| DNS | DNSimple (Terraform DNSimple provider) |
| Infra strategy | Create fresh Terraform-managed infra, verify on `next.benebsworth.com`, then cut over |
| Repo layout | New app at root, old Gatsby moved to `legacy/` (git-tagged) |

## Repository Layout

```
benebsworth.com/
  app/
    layout.tsx                 # root layout, fonts, metadata, theme
    page.tsx                   # landing (grid nav)
    projects/page.tsx          # project index
    projects/[slug]/page.tsx   # project detail (Nutry, etc.)
    blog/page.tsx              # blog index
    blog/[slug]/page.tsx       # blog post
    about/page.tsx             # bio, timeline, speaking, certifications, skills
    lab/page.tsx               # generative artifacts (optional; "doodle" tile target)
    sitemap.ts, robots.ts      # SEO
    feed.xml/route.ts          # RSS (static via generateStaticParams pattern)
  components/
    landing/
      packer.ts                # monotone →/↓ packing solver (pure, unit-tested)
      grid-nav.tsx             # SVG grid renderer + animation + responsive orientation
      artifact-tiles.tsx       # gap-tile renderers (image/text/anim/avatar/glyph)
      artifacts.ts             # artifact pool definitions + links
    ui/                        # shadcn components
    site/                      # shared nav, footer, theme primitives
  content/
    blog/<slug>/index.mdx      # 28 migrated posts + assets
    projects/<slug>.mdx        # project entries
    about.ts                   # structured about data (typed by proto)
  lib/
    content.ts                 # MDX/frontmatter loader, typed + validated
    gen/                       # generated TS from proto (checked in)
  proto/
    content.proto              # BlogPost, Project, About, Artifact models
    buf.gen.yaml, buf.yaml
  infra/
    modules/site/              # reusable: S3 + CloudFront(OAC) + ACM + DNSimple + CF function
    envs/
      staging/                 # next.benebsworth.com
      prod/                    # benebsworth.com (+ www)
    cloudfront-rewrite.js      # clean-URL CloudFront Function
  legacy/                      # old Gatsby site (moved here), built with pathPrefix=/archive
  scripts/
    deploy.sh                  # build + assemble + s3 sync + invalidate
    build-archive.sh           # build legacy gatsby into out/archive
  next.config.mjs              # output: export, trailingSlash: true, images
  Makefile                     # dev / deploy.next / deploy.prod (mirrors old targets)
```

## Data Models (Protobuf)

`proto/content.proto` defines the canonical content schema. Types are generated to
`lib/gen/` via `buf generate` (ts-proto) and used purely as compile-time types + a runtime
validator for MDX frontmatter. No protobuf runtime ships to the browser.

```protobuf
syntax = "proto3";
package content;

message Technology { string text = 1; string color = 2; }

message Link { string url = 1; bool outbound = 2; }

message Project {
  string slug = 1;
  string title = 2;
  string description = 3;
  string image = 4;
  Link link = 5;
  repeated Technology technologies = 6;
  string body_path = 7;            // MDX source
  int32 order = 8;
}

message BlogPost {
  string slug = 1;
  string title = 2;
  string date = 3;                 // ISO 8601
  string description = 4;
  repeated string tags = 5;
  string hero_image = 6;
  bool draft = 7;
}

message TimelineEntry { string when = 1; string title = 2; string detail = 3; }
message SpeakingEvent { string title = 1; string description = 2; string url = 3; string date = 4; }
message Certification { string title = 1; string issuer = 2; string url = 3; }

message About {
  string bio = 1;
  repeated TimelineEntry timeline = 2;
  repeated SpeakingEvent speaking = 3;
  repeated Certification certifications = 4;
  repeated string skills = 5;
}

enum ArtifactKind { ARTIFACT_KIND_UNSPECIFIED = 0; IMAGE = 1; TEXT = 2; ANIM = 3; AVATAR = 4; GLYPH = 5; }
message Artifact {
  string id = 1;
  string label = 2;
  string link = 3;
  ArtifactKind kind = 4;
  string image = 5;                // for IMAGE
  repeated string lines = 6;       // for TEXT
  string glyph = 7;                // for GLYPH
}
```

A `lib/content.ts` loader parses frontmatter (gray-matter), maps it onto these generated
types, and throws at build time on schema violations.

## Landing Engine

### Packer (`packer.ts`)
- Pure function: given `(cols, rows, words[])`, returns a placement `{word: cell[]}` or null.
- Each word is placed as a **monotone path** (each step right or down only) via randomized
  backtracking; words are disjoint; gaps allowed.
- Deterministic given a seed (seedable RNG) so the same render is reproducible for tests.
- Unit-tested invariants: every placed path is contiguous and strictly →/↓; no two words
  overlap; all cells in-bounds; solver succeeds for both 4×5 and 5×4.

### Grid renderer (`grid-nav.tsx`)
- Renders an SVG board sized to fit available viewport (cell size computed from min of
  width/height budget). Dot grid backdrop.
- Orientation chosen by viewport: portrait/narrow → 4 cols × 5 rows; landscape → 5 cols × 4 rows.
  Re-packs (debounced) on resize.
- Entry animation: per-word staggered glyph pop-in (scale), optional faint path trail.
- Words are `<a>` links (`/blog`, `/projects`, `/about`); hover/focus isolates a word by
  dimming the others; full keyboard focusability and visible focus states.
- `prefers-reduced-motion`: skip animation, render final layout immediately.

### Artifact tiles (`artifact-tiles.tsx`, `artifacts.ts`)
- The leftover cells (4 gaps) are filled from a shuffled pool of `Artifact`s (featured
  project image, latest post text card, live generative doodle, avatar, GitHub glyph, talk).
- Each tile is a focusable link; hover/focus reveals a label.
- Pool > slots, so selection + placement reshuffle each load.
- Real images use `next/image` (unoptimized for static export, or export-time optimizer);
  the "latest post" tile is data-driven from the newest non-draft `BlogPost`.

## Content Pipeline

- MDX files in `content/`. Frontmatter parsed with `gray-matter`, validated against proto types.
- Rendered with `next-mdx-remote/rsc` in Server Components.
- remark/rehype plugins: `remark-gfm`, `rehype-pretty-code` (Shiki) for syntax highlighting
  (replaces old Prism/vscode highlighting), `rehype-slug` + autolink headings.
- `generateStaticParams` enumerates slugs → SSG pages in the export.
- Blog assets co-located per post folder; referenced relatively and copied into the export.

## Sections

- **Projects:** responsive card grid (shadcn `Card`), colored tech `Badge`s, links to detail
  pages or outbound repos. Migrates Nutry + "this blog" and is easy to extend.
- **Blog:** index list (title, date, tags, description) sorted by date; post pages with
  highlighted code, headings/anchors, prev/next. RSS feed + per-post OG/JSON-LD.
- **About:** bio blurb, vertical timeline, speaking list, certifications, skills — content
  migrated from the current `AboutPage` components into `content/about.ts`.

## Archive

- Move current Gatsby project into `legacy/`. Tag the pre-move commit `legacy-gatsby`.
- Set Gatsby `pathPrefix = "/archive"`; build with `gatsby build --prefix-paths`.
- `scripts/build-archive.sh` outputs into `out/archive/` after the Next export.
- CloudFront serves `out/archive/*` as plain static files from the same bucket.
- New site shows a subtle "view the old site →" link (footer or an artifact tile) to `/archive/`.
- Risk: the old Gatsby (v2 / React 16) toolchain may need a pinned Node version to build;
  `build-archive.sh` will pin Node (e.g. via `.nvmrc`/`nvm use`) and document it.

## Infrastructure & Deploy (Terraform)

**Module `infra/modules/site`** (parameterized by domain, aliases, bucket name):
- Private S3 bucket (`ap-southeast-2`), versioning on, no public access.
- CloudFront distribution with **Origin Access Control** to the bucket; default root object
  `index.html`; compression on; HTTP→HTTPS redirect.
- **ACM certificate in `us-east-1`** (CloudFront requirement), DNS-validated.
- **CloudFront Function** (`cloudfront-rewrite.js`) for clean URLs: rewrite `/path/` →
  `/path/index.html` and bare `/path` → `/path/index.html`; pairs with `trailingSlash: true`.
- DNSimple records: ACM validation CNAMEs + ALIAS/CNAME from domain → CloudFront.
- Outputs: distribution id, CloudFront domain, bucket name.

**Environments:**
- `infra/envs/staging` → `next.benebsworth.com` (verify here first).
- `infra/envs/prod` → `benebsworth.com` + `www.benebsworth.com`.
- Remote state: S3 backend (or local to start; documented).

**Deploy (`scripts/deploy.sh`, Makefile targets `deploy.next` / `deploy.prod`):**
1. `next build` (static export → `out/`).
2. `build-archive.sh` → old Gatsby into `out/archive/`.
3. `aws --profile ben s3 sync out/ s3://<bucket> --delete` (correct cache headers:
   long cache for hashed assets, short/no-cache for HTML).
4. `aws --profile ben cloudfront create-invalidation --paths '/*'`.

**Cutover:** apply staging → deploy → verify on `next.` → apply prod → deploy →
repoint `benebsworth.com` apex/`www` in DNSimple to the new CloudFront → retire old
distribution later.

## Performance, SEO, Accessibility

- Static export, route prefetching, no client JS on content pages beyond hydration of
  interactive bits; landing JS is small and dependency-free.
- `next/image` for tiles/heroes (unoptimized or export optimizer), explicit dimensions to
  avoid CLS.
- Metadata API for titles/descriptions/OpenGraph; `sitemap.ts`, `robots.ts`, RSS, JSON-LD
  for posts. Preserve old keywords/description intent.
- Accessibility: semantic landmarks, the grid words/tiles are real links with visible focus,
  `prefers-reduced-motion` honored, WCAG AA contrast verified for the neon-on-dark palette.

## Testing

- **Unit:** `packer.ts` invariants (monotone, disjoint, in-bounds, solvable both orientations,
  seeded determinism); `lib/content.ts` frontmatter validation.
- **E2E (Playwright MCP):** landing renders all three words + tiles; clicking a word routes to
  the section; resize swaps orientation; reduced-motion renders final state.
- **Build gates:** `next build` succeeds with static export; archive build succeeds; `tsc` clean.

## Milestones (for the implementation plan)

1. **Scaffold:** Next.js + TS + Tailwind + shadcn; proto + buf codegen; base layout/theme; move Gatsby → `legacy/` + tag.
2. **Landing:** packer + tests; grid-nav; artifact tiles; responsive + reduced-motion.
3. **Content system:** MDX pipeline, content loader (proto-typed), migrate posts/projects/about.
4. **Sections:** projects, blog, about pages with shadcn UI; RSS/sitemap/SEO.
5. **Archive:** rebuild Gatsby under `/archive`; assemble into export.
6. **Infra + deploy:** Terraform module + staging/prod; deploy scripts; verify on `next.`; cut over.

## Risks / Open Items

- Old Gatsby build may require a pinned legacy Node; handled in `build-archive.sh`.
- DNSimple nameserver setup currently also shows Google Cloud DNS NS records — confirm the
  authoritative provider before the prod DNS cutover.
- `next/image` under static export needs `unoptimized` or an export-time optimizer; pick during scaffold.
