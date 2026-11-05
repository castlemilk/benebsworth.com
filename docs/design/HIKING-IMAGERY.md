# Hiking cover family, 5 November 2026

This slice reuses real, already-authored guide photographs where verified and retains the original painterly artwork for other hikes. It does not invent documentary trek imagery or alter photographs beyond proportional resizing and WebP encoding.

## Source provenance

- Haute Route: Lac de Louvie. Source https://storage.googleapis.com/benebsworth-hiking/assets/1782650244671-img-1290.webp, already used in content/blog/haute-route-guide/index.mdx, Day 1. Original 2200 × 1650. Visually inspected before selection: lake, reflected snow peaks and hikers on the shore.
- Overland Track: Ronny Creek. Source https://storage.googleapis.com/benebsworth-hiking/assets/1783245630066-img-7823.webp, already used in content/blog/overland-track-guide/index.mdx, Day 1. Original 2200 × 1650. Visually inspected before selection: hiker, Overland Track sign and snowy trailhead.
- Each has 640 × 480 and 1200 × 900 proportional WebP derivatives at quality 85. No generative editing, recolouring, compositing or subject replacement. Existing original URLs and all ten public/hiking/art files remain intact.

## Presentation contract

The 5 November follow-up direction separates Hiking from the handwritten blog and Lab. Hiking index and trail details use their own stone/forest palette, plain serif display hierarchy, sans-serif navigation/metadata and straight selected-state rules. The index's red hand underline and duplicate handwritten latest-trail annotation are removed. About retains its independent crisp professional theme. Blog articles, including trail guides, retain the blog's authored editorial system; their shared image cross-links are unchanged.

content/hiking-imagery.ts is the shared source/type/caption/focal-point authority. HikeCover serves index entries, detail banners, legacy cards and guide cross-links. Photographs are explicitly captioned; eight other hikes keep labelled illustrations. Art fallback remains available after a failed photograph, followed by an honest unavailable state if both fail. Source dimensions and responsive sizes reserve space and select the smaller photo on narrow views.

The prior large route overlay is removed from imagery. A separate small caption diagram is explicitly labelled Schematic route. JourneyMap likewise labels its hand-set route and elevation spacing as illustrative and removes invented contour rings. These are not accurate geographic maps. Source-backed route replacement is separate work in progress; do not silently substitute a generic trail for the author's actual itinerary or transfer legs.

Hike detail social images read the same source through the existing build-time conversion helper. The index social image uses the existing first-hike illustration. Live gallery content, order, proportions, filters and lightbox behavior remain intact. Empty galleries no longer fabricate placeholder-photo tiles. Search is unchanged, as it uses topic symbols rather than hiking photos.

## Verification gates

Preserve all ten hike records, waypoint sequences, guide links, statistics and planned/completed status. Check all index covers and representative completed/photo/planned detail pages; narrow/light/dark; fallback; gallery filter/lightbox close/focus; and the generated social images. Exact CI build and rendered acceptance remain separate from source tests and deployment.
