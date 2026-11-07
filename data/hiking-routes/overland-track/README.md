# Overland Track geometry audit — 2026-11-05

## Deliverable and acceptance
The retained primary OpenStreetMap source describes a community-mapped standard route with a lakeshore continuation, not an official surveyed track or Ben Ebsworth's exact itinerary.

`public/hiking/routes/overland-standard-osm.json` is a lossless conversion of ordered member ways into SIX separate LineStrings. All within-section joins use identical OSM node IDs; every section has two degree-one endpoints and no branches. No coordinate interpolation or gap bridging was applied. Complete continuity FAILS: section 1 ends 184.62 m from section 2's start. Preserve the gap until actual source geometry resolves it. Do not represent this artifact as a fully verified uninterrupted trail.

Raw source: https://api.openstreetmap.org/api/0.6/relation/1673569/full and each section-{ID}.osm from https://api.openstreetmap.org/api/0.6/relation/{ID}/full. Parent relation 1673569 version 33, timestamp 2026-04-14T16:36:41Z. Each raw file contains the exact current way/node versions; source hashes, sizes, section versions/endpoints and distance are in primary-validation.json. The repository source check reproduces the geometry validation offline.

Mapped 2D length excluding the gap: 77,405.586 m. North start [145.9431102,-41.6389352]; south end [146.1729846,-42.1167312], coordinate order longitude/latitude. Raw relation nomenclature and published trail reference associate these with Ronny Creek and Cynthia Bay. Geometry and continuity have been checked numerically, not surveyed or browser-overlaid on an authoritative map. No elevation values are supplied. Maximum internal vertex segment is about 115 m.

## Reuse terms
Raw API XML explicitly declares OpenStreetMap and contributors, license http://opendatacommons.org/licenses/odbl/1-0/ and attribution http://www.openstreetmap.org/copyright. Display © OpenStreetMap contributors and a license/copyright link; preserve applicable ODbL derivative-database/redistribution requirements. No assertion that all site application code must be ODbL. A separate basemap has its own license and hosting terms.

## Itinerary variants
This includes the Narcissus-to-Cynthia Bay lakeshore WALK. Ben's authored guide instead states a FERRY finish, eight winter days, and summit excursions. Do not relabel the standard route as his personal GPS record; no Mt Ossa/Oakleigh summit branches or ferry geometry were validated. Parent itinerary evidence is in content/blog/overland-track-guide/index.mdx. Official contextual reference: https://parks.tas.gov.au/explore-our-parks/cradle-mountain/overland-track . OSM community data is not official park geometry.

## Application integration source gate

The retained source files are under `source/`. The archived `source/validate.py` converter resolves inputs beside its own file and writes regenerated reports there; it is not the read-only repository check. Run `python scripts/hiking/check-overland-source.py` from the checkout instead. This read-only gate checks all pinned raw files, reconstructs each source-node chain, and compares every coordinate with `public/hiking/routes/overland-standard-osm.json`. The client additionally pins the exact public route file SHA-256 before showing it. No photo metadata is stored alongside this route source.
