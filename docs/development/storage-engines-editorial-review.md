# B-trees and LSM-trees editorial review

## Scope

7 November 2026. Continuation of the requested article de-slop reviews.
The candidate starts at `1ac25cfa1fe7dbcb89513beedea85c43cb137c1a`, the
Backpressure PR97 merge on `codex/gamma-blog-editorial-20261027`. It does not
include PR95's About/Hiking work or the separate local focus fix. The gallery
configuration decision and other release holds remain unchanged.

The five-file boundary is the article, its generated Markdown sibling, the
single StorageEngineSim description in the sibling generator, a regression test
and this receipt. No widget implementation, route, asset, renderer, dependency,
credential or release-control change is included.

## Editorial and factual changes

- Removed the repeated religion/tax/invoice metaphors and the claim that all
  databases belong to two exhaustive categories. The opening now follows the
  foreground write and deferred maintenance work.
- Separated logical tree height, cached page access and physical I/O. The
  fan-out example remains illustrative rather than promising three reads for
  every row in a billion.
- Distinguished PostgreSQL's heap/MVCC updates from InnoDB's clustered row
  storage. Corrected the Python example and explicitly said that a replacement
  key-value write is not equivalent to a transactional SQL balance update.
- Qualified the L times T expression as a simplified classic-leveled estimate.
  Removed universal 50-times and all-sequential claims. Named policy, overlap,
  workload and measurement layer as relevant limits.
- Corrected RUM from a conservation law/theorem/guarantee to a conjecture and
  design framework. Replaced the equation's "any two, never all three" suffix
  with "RUM conjecture" and labelled the expression schematic in both caption
  and body. The equation ID and copyable mathematical core remain.
- Explained snapshot and tombstone reclamation conditions, plus concurrency
  work that remains despite immutable SSTables.
- Inspected the actual widget's top-down B-tree insertion, two-level LSM merge
  rule and workload-weighted qualitative scores. The article and generated
  widget description now disclose those limits, operation-count versus byte
  measurements and notional byte sizes. The simulation was not changed.
- Shortened related filesystem/SSD/Kafka comparisons and removed the unsupported
  current MongoDB/WiredTiger LSM claim. Similar cleanup mechanisms are no longer
  equated with the same data structure.

Examples: "They're conserved" became "There is no fixed sum of these ratios."
"An LSM-tree never overwrites a byte on disk" became an explanation of immutable
SSTables and reader/file lifetime. The PostgreSQL example now says an update
creates a new heap tuple version, with HOT eligibility stated separately.

## Sources checked

- [PostgreSQL HOT documentation](https://www.postgresql.org/docs/current/storage-hot.html) and [index-only scans](https://www.postgresql.org/docs/current/indexes-index-only-scans.html): new tuple versions, HOT conditions, heap/index separation and visibility.
- [MySQL 8.4 clustered and secondary indexes](https://dev.mysql.com/doc/refman/8.4/en/innodb-index-types.html): row storage and primary-key lookup through a secondary index.
- [RocksDB compaction guide](https://github.com/facebook/rocksdb/wiki/Compaction): classic leveled versus tiered costs, overlapping-file compactions and workload-dependent amplification.
- [RUM author publication page](https://stratos.seas.harvard.edu/publications/designing-access-methods-rum-conjecture) and its linked paper: conjecture wording and proposed bounds. This replaces the old Harvard PDF URL, which returned 404.
- [Original LSM paper](https://www.cs.umb.edu/~poneil/lsmtree.pdf), [Cassandra storage engine](https://cassandra.apache.org/doc/latest/cassandra/architecture/storage-engine.html), [Kafka log compaction](https://kafka.apache.org/41/design/design/#log-compaction) and [Database Internals](https://www.databass.dev/): supporting layout and comparison checks.
- The original ACM B-tree DOI remains, but its publisher page returned 403 in this session. It was not counted as a successfully fetched primary source.

## Preservation and verification

Original publication date, author, classification, release flag, artwork and
slug are preserved. The title, description and takeaways are revised and
`dateModified` records the review. All seven section headings/anchors and three
widget instances remain. All three equation IDs and numbering remain; the first
two expressions are unchanged and the RUM suffix is intentionally corrected.
Three original reference destinations remain, the broken RUM destination is
replaced, and primary implementation references are added. Stat labels/contexts
are corrected rather than preserving misleading performance claims.

The unchanged simulator source SHA-256 is
`ae48dfbb1e1638a93ddb78ce2907c489e40bc56257b71572d1bfca1b1e9fa917`.

Checks:

- Prose: 3,363 to 2,158 extracted words; 107 to 20 warnings; zero hard errors.
  Remaining warnings are mostly technical passive constructions, longer
  explanatory sentences, source titles and the definition list. They were
  reviewed, not suppressed or hidden from the validator.
- Focused real-MDX rendering/equation/article tests: 32 passed. The test resolves
  the real client widget directly because its production wrapper disables SSR.
  It is not a claim of browser interaction testing.
- New technical-limit test fails on the original source and passes on the
  revised source. The baseline deliberately ran only that test.
- Full single-worker suite: 1,869 passed, 5 skipped; 153 passing test files,
  two skipped. This is the independent editorial branch, not the Hiking branch.
- TypeScript and whitespace checks passed. Scoped ESLint has zero errors and
  eight existing console-statement warnings in the generator; no new warning
  site was introduced. Generated Markdown check passed.
- Full production export passed: 535 static pages, 161 OG file renames and
  24 HTML rewrites. Pagefind indexed 76 pages and 14,605 words. The built article
  contains the revised text and three rendered equations; its Markdown bytes
  equal the generated source sibling.
- Node 24 used existing locked dependencies, a 2 GiB heap and a temporary
  single-worker setting, restored byte-for-byte. The benchmark generator ran
  with native Node TypeScript support as in the recovery runbook. Empty HOME
  preserved the existing harness dataset. Public gallery and Google client
  inputs were empty.
- Browser layout/interaction acceptance remains unverified. The supported cloud
  browser could not reach the local static server (connection refused). No
  alternate browser automation or access/security change was used. The widget
  code and styles are unchanged; real-MDX render tests are separate evidence.

## Release boundary

Source validation, remote exact-head CI, preview publication and live content
verification are separate gates. The current release path targets the existing
editorial preview only. No production-domain promotion or gallery data change is
part of this work. PR97's earlier preview deployment and alias are verified,
but unauthenticated HTTP and the existing browser reach Vercel login rather
than the article; no access setting or temporary sharing grant was changed.
