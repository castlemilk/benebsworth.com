# Grounded Forms discovery partitions

The authored catalogue, source packets, original masters and all detail routes stay unchanged. The collection no longer serializes every card on arrival.

## Data and loading

- The server renders the first 24 display cards and sends a bootstrap with those cards, total count, complete sorted subjects/tags, and one content-addressed manifest URL. The bootstrap has a hard 70,000-byte cap; exceeding it fails generation rather than silently truncating facets or raising the budget.
- The first page performs no discovery JSON fetch. A query, filter, or later-page URL loads the manifest, which contains complete curated title/slug/subject/tag/alias search records in registration order and the card-partition directory. Search uses the existing normalization, prefix matching and exact-match ranking before pagination.
- Display metadata is split into 24-card JSON files. Only partitions needed for the selected page are fetched. Cards contain the light thumbnail URL, title, subject, minimum width and canonical slug. They contain no master URLs, previews, dark/mono thumbnails or scientific paragraphs. Loading JSON never fetches images; only the selected rendered cards request thumbnails.
- Files live under `/artwork/grounded-discovery/`, outside the strict original-asset inventory. Full SHA-256 names prevent mixing metadata from different catalogue revisions. The build prepares files deterministically through both npm and Task's existing generation paths, including dev/test/watch. Generated files are ignored, not source-controlled.
- One collection-scoped cache holds promises by file URL, bounded by the number of catalogue files, not the number of queries. Requests share one serial lane. Failed requests are evicted; the UI offers explicit retry without automatic retries. A 15-second deadline covers fetching and body decoding, aborts the request and releases the lane even if an obsolete request stalls.
- URL state remains authoritative. Effect cleanup and query-keyed display state prevent older successes/errors from replacing a newer query, clear or history state. Pending/error states show neither stale cards nor a false empty result. Clearing restores the first page immediately and focuses search. The page size remains 24; malformed pages clamp as before.
- Complete facets are available without waiting for metadata. JSON-LD lists only the initial visible page. Global Pagefind records and the sitemap still cover every artwork independently.

## Verification

`partitions.test.ts` exercises a diverse synthetic 1,000-work catalogue, including distinct titles, aliases, canonical slugs and unique tags alongside shared tags. It checks every work through every curated search field, intersected filters, all 42 pages, exact ranking across partition boundaries, bounded initial data, deterministic files, deduplicated concurrency, failures, malformed metadata and stalled-request recovery.

`grounded.test.tsx` covers actual DOM controls, URL restoration, complete facets, loading/error/retry, clear focus, delayed results, newer queries and 1,000-work initial rendering. Browser regressions in `e2e/grounded-artwork.spec.ts` add arrival and on-demand transfer receipts, failed metadata recovery, delayed clear, Back/Forward and deep-page clamping. These run through the existing Playwright workflow; local unit tests do not substitute for rendered browser acceptance. Successful-run metrics are retained in CI stdout under `GROUNDED_TRANSFER_INITIAL` and `GROUNDED_TRANSFER_ON_DEMAND_CUMULATIVE`; JSON attachments support failure review. The latter receipt is cumulative, including an injected failure and retry, and must not be added to the initial receipt. Both capture actual requested resources, not a sum of alternate exported HTML/Flight files. Discovery screenshots use the retained `gallery-view-grounded-discovery-*.png` pattern. See the [development checkpoint](../development/grounded-discovery-review.md) for measurement boundaries and pending acceptance.

Postbuild `check-grounded-output.mts` reads the exported HTML's actual serialized Flight bootstrap and verifies it against the bounded data, checks all generated partition bytes, bounds collection JSON-LD, reports HTML/Flight/JSON-LD/bootstrap and initial thumbnail body sizes, and retains every existing detail-route and original-asset verification. Raw/body bytes are not browser network transfer sizes; browser receipts report those separately.

## Limits

The complete curated search manifest grows with the catalogue, but is fetched only when discovery beyond the initial page is requested. Complete facet names also grow; the unchanged bootstrap gate makes that growth explicit. At 1,000 works the fixture remains below budget. This design does not promise constant bytes for arbitrarily many distinct tags or catalogue entries.

An open tab may request an old content hash after a deployment that removed that hash. It fails visibly rather than mixing revisions; reloading the collection obtains the current bootstrap. Persistent storage or a new service is not required.
