# Trailkit Component Reference

Prop reference for every Trailkit MDX component. Prop names are transcribed verbatim from the TypeScript interfaces in `components/mdx/trailkit/`. Use this alongside the worked example at `content/blog/overland-track-guide/index.mdx`.

---

## Hike auto-binding

`TrailSummary` and `TrailMap` accept `hike="<slug>"`. When provided, both components call `getHikeDefaults(slug)` (from `hike-binding.ts`), which looks up the hike by slug in `content/hiking.ts` and returns:

- all index stats (`distanceKm`, `days`, `elevationGainM`, `maxAltitudeM`, `region`, `country`, `name`)
- the per-hike `accent` colour (the CSS `--accent` var is set inline)
- the `waypoints` array (for `TrailMap` route rendering)

**Never re-type these numbers** — pass `hike="slug"` and let the binding pull from the canonical source. Any explicit prop overrides the bound value (e.g. `accent="#ff0000"` wins over the hike's accent).

---

## Difficulty bands

Derived automatically by `deriveDifficulty()` from `distanceKm`, `days`, `elevationGainM`, `maxAltitudeM`. Can be overridden on `TrailSummary` with `difficulty="…"`.

| Band | CSS var | Typical profile |
|------|---------|-----------------|
| `easy` | `--trail-easy` (teal `#4f9d8f`) | Short, low, gentle |
| `moderate` | `--trail-moderate` (blue `#5aa0b5`) | Multi-day with moderate ascent |
| `hard` | `--trail-hard` (terracotta `#c2693a`) | Long or high or technical |
| `severe` | `--trail-severe` (red `#b4453a`) | Very long + high + sustained ascent |
| `extreme` | `--trail-extreme` (near-black / near-white in dark mode) | Alpine mountaineering |

---

## `<TrailSummary>`

**Source:** `components/mdx/trailkit/trail-summary.tsx` → `TrailSummaryProps`

Hero "at a glance" card: headline stats, derived difficulty badge, season/gear pills, expandable secondary figures. Place at the very top of the post, immediately after the opening sentence.

### Props

| Prop | Type | Required | Note |
|------|------|----------|------|
| `hike` | `string` | optional | Slug from `content/hiking.ts`; auto-binds all stats, accent and waypoints |
| `title` | `string` | optional | Card heading; defaults to the bound hike's `name` or `'The route'` |
| `region` | `string` | optional | Region line below the title; bound from hike if omitted |
| `country` | `string` | optional | Country line; bound from hike if omitted |
| `distanceKm` | `number` | optional | Total distance in km; bound from hike if omitted |
| `days` | `number` | optional | Days on trail; bound from hike if omitted |
| `elevationGainM` | `number` | optional | Total ascent in metres; bound from hike if omitted |
| `maxAltitudeM` | `number` | optional | High point in metres; bound from hike if omitted |
| `difficulty` | `'easy' \| 'moderate' \| 'hard' \| 'severe' \| 'extreme'` | optional | Override the auto-derived difficulty band |
| `season` | `string` | optional | Season window pill, e.g. `"Oct–May"` |
| `gearClass` | `string` | optional | Gear class pill, e.g. `"Hut-to-hut · alpine, any season"` |
| `accent` | `string` | optional | CSS colour override (hex/hsl); defaults to the hike's accent or `var(--color-blog)` |
| `map` | `boolean` | optional | Show an inline mini route map inside the card (requires a bound hike or waypoints) |

### Example

```mdx
<TrailSummary
  hike="overland-track"
  season="Oct–May"
  gearClass="Hut-to-hut · alpine, any season"
  map
/>
```

Standalone (no hike binding):

```mdx
<TrailSummary
  title="Mont Blanc Circuit"
  region="Alps"
  country="France / Italy / Switzerland"
  distanceKm={170}
  days={11}
  elevationGainM={10000}
  maxAltitudeM={2665}
  difficulty="severe"
  season="Jul–Sep"
  gearClass="Hut-to-hut"
  accent="#6b8e7f"
/>
```

---

## `<TrailMap>`

**Source:** `components/mdx/trailkit/trail-map.tsx` → `TrailMapProps`

A stylised topographic route plate — a smooth line through numbered waypoints over a faint contour backdrop, with a peak marker on the high point and an elevation-profile strip. Not a geographic map. Wraps `JourneyMap` from the hiking section.

### Props

| Prop | Type | Required | Note |
|------|------|----------|------|
| `hike` | `string` | optional | Slug from `content/hiking.ts`; auto-binds waypoints, accent and name |
| `waypoints` | `HikeWaypoint[]` | optional | Explicit waypoint array for non-hike usage (at least 2 required) |
| `name` | `string` | optional | Route name used when building a synthetic hike from explicit waypoints |
| `accent` | `string` | optional | Colour override; wins over the bound hike's accent |
| `showElevation` | `boolean` | optional | Show the elevation-profile strip (default `true`) |
| `compact` | `boolean` | optional | Glyph mode — hides start/end chips and stat band, tightens the plate |

### Example

```mdx
<TrailMap hike="overland-track" />
```

Compact (inside a `TrailSummary`):

```mdx
<TrailMap hike="overland-track" compact showElevation />
```

---

## `<Stages>` / `<Stage>` / `<Checkpoint>`

**Source:** `components/mdx/trailkit/stages.tsx`

The day-by-day spine of the guide. `<Stages>` renders a vertical contour-spine timeline; each `<Stage>` is one day/segment; `<Checkpoint>` marks key waypoints inline in prose or inside a `<Stage>`.

---

### `<Stages>` wrapper

| Prop | Type | Required | Note |
|------|------|----------|------|
| `children` | `ReactNode` | optional | `<Stage>` elements |
| `accent` | `string` | optional | Sets `--accent` for the entire timeline spine |

---

### `<Stage>` — `StageProps`

| Prop | Type | Required | Note |
|------|------|----------|------|
| `day` | `string \| number` | optional | Renders as `"Day N"` if a number, verbatim if a string |
| `from` | `string` | optional | Start point of the stage |
| `to` | `string` | optional | End point of the stage |
| `distanceKm` | `number` | optional | Stage distance in km |
| `ascentM` | `number` | optional | Stage ascent in metres |
| `descentM` | `number` | optional | Stage descent in metres |
| `timeHours` | `number \| string` | optional | Walking time; number → `"N h"`, string used verbatim (e.g. `"4–6"`) |
| `terrain` | `string` | optional | Mono terrain description line below the stat chips |
| `accent` | `string` | optional | Per-stage accent override |
| `children` | `ReactNode` | optional | Narrative prose; `<Checkpoint>` components can be placed here |

---

### `<Checkpoint>` — `CheckpointProps`

| Prop | Type | Required | Note |
|------|------|----------|------|
| `name` | `string` | **required** | Checkpoint name |
| `elevM` | `number` | optional | Altitude in metres |
| `kind` | `IconKind` | optional | Icon type; defaults to `'milestone'`. Values: `pass`, `summit`, `water`, `junction`, `viewpoint`, `camp`, `hut`, `milestone`, `rifugio`, `hotel`, `bivvy`, `refuge`, `gorge`, `lake`, `monument`, `glacier` |
| `note` | `ReactNode` | optional | Short descriptive note below the name |

`<Checkpoint>` renders a `<span>` (not a `<div>`), so it is safe inside MDX paragraphs.

### Example

```mdx
<Stages>
  <Stage day={1} from="Ronny Creek" to="Waterfall Valley" distanceKm={10.7} ascentM={500} timeHours="4–6" terrain="Boardwalk, rocky plateau, alpine scrub">
    The big climb is the first thing. From Ronny Creek the boardwalk crosses button-grass
    moorland before the track pitches steeply up to Marions Lookout.

    <Checkpoint name="Marions Lookout" elevM={1223} kind="viewpoint" note="The big climb out of Cradle Valley — Crater Lake below, Barn Bluff ahead." />
    <Checkpoint name="Waterfall Valley Hut" elevM={1130} kind="hut" />
  </Stage>

  <Stage day={2} from="Waterfall Valley" to="Lake Windermere" distanceKm={7.8} ascentM={150} timeHours={3}>
    A short, high day crossing the plateau.
  </Stage>
</Stages>
```

---

## `<Stop>`

**Source:** `components/mdx/trailkit/stop.tsx` → `StopProps`

Accommodation card for a hut, campsite or other overnight stop. Wrap multiples in `<TrailGrid>`.

### Props

| Prop | Type | Required | Note |
|------|------|----------|------|
| `name` | `string` | **required** | Name of the stop |
| `type` | `'hut' \| 'rifugio' \| 'camp' \| 'hotel' \| 'bivvy' \| 'refuge'` | **required** | Sets the icon and type label |
| `elevM` | `number` | optional | Altitude in metres |
| `capacity` | `number` | optional | Bed/bunk count |
| `booking` | `ReactNode` | optional | Booking note or link |
| `water` | `boolean` | optional | Water available at this stop |
| `meals` | `boolean` | optional | Meals available at this stop |
| `note` | `ReactNode` | optional | Short description |
| `accent` | `string` | optional | Colour override |

### Example

```mdx
<TrailGrid>
  <Stop
    name="Waterfall Valley Hut"
    type="hut"
    elevM={1130}
    capacity={24}
    water
    note="The first hut on the track, in a sheltered hollow just below the plateau. Open fire and a good view of Barn Bluff."
  />
  <Stop
    name="New Pelion Hut"
    type="hut"
    elevM={1037}
    capacity={26}
    water
    meals={false}
    booking="Parks Tasmania booking essential Oct–May"
  />
</TrailGrid>
```

---

## `<Landmark>`

**Source:** `components/mdx/trailkit/landmark.tsx` → `LandmarkProps`

Card for a notable feature along the route. Wrap multiples in `<TrailGrid>`.

### Props

| Prop | Type | Required | Note |
|------|------|----------|------|
| `name` | `string` | **required** | Feature name |
| `kind` | `'summit' \| 'gorge' \| 'lake' \| 'pass' \| 'monument' \| 'glacier' \| 'viewpoint'` | optional | Sets the icon; defaults to `viewpoint` |
| `elevM` | `number` | optional | Altitude in metres |
| `bearing` | `string` | optional | Compass bearing or direction, e.g. `"NW from Pelion Plain"` |
| `image` | `string` | optional | Image path or URL |
| `alt` | `string` | optional | Image alt text; defaults to `name` |
| `accent` | `string` | optional | Colour override |
| `children` | `ReactNode` | optional | Prose description |

### Example

```mdx
<TrailGrid>
  <Landmark name="Barn Bluff" kind="summit" elevM={1559} bearing="SW from Waterfall Valley">
    The great blunt silhouette visible from the plateau for most of day one. A return side trip from Waterfall Valley.
  </Landmark>
  <Landmark name="Narcissus Bay" kind="lake" bearing="S terminus of the track">
    Where the track ends at the shore of Lake St Clair. Most walkers take the ferry; those with a rest day walk the shore.
  </Landmark>
</TrailGrid>
```

---

## `<Quest>`

**Source:** `components/mdx/trailkit/quest.tsx` → `QuestProps`

A side-quest card for an optional detour or side-trip. Used standalone (not inside `<TrailGrid>`).

### Props

| Prop | Type | Required | Note |
|------|------|----------|------|
| `title` | `string` | **required** | Side-trip name |
| `extraKm` | `number` | optional | Extra distance in km (round trip) |
| `extraAscentM` | `number` | optional | Extra ascent in metres |
| `extraTimeHours` | `number \| string` | optional | Extra time; number → `"+N h"`, string used verbatim |
| `payoff` | `ReactNode` | optional | "Why bother" sentence rendered after the body |
| `difficultyDelta` | `'same' \| 'harder' \| 'much-harder'` | optional | Relative difficulty vs the main route |
| `optional` | `boolean` | optional | Defaults to `true`; adds `· optional` to the eyebrow |
| `accent` | `string` | optional | Colour override |
| `children` | `ReactNode` | optional | Prose description of the side trip |

### Example

```mdx
<Quest
  title="Mount Ossa (1,617 m)"
  extraKm={6.4}
  extraAscentM={600}
  extraTimeHours={4}
  difficultyDelta="harder"
  payoff="Tasmania's highest summit on a clear day gives the only true top-down view of the whole park — worth every step."
>
  From the junction on Pelion Plains the track climbs steeply through alpine heath to the exposed ridge.
  The final scramble to the cairn is hands-and-feet in places.
</Quest>
```

---

## `<Flora>` / `<Fauna>`

**Source:** `components/mdx/trailkit/species.tsx` → `SpeciesProps`

Both components share the same prop interface. `<Flora>` uses a leaf icon; `<Fauna>` uses a track icon. Wrap multiples in `<TrailGrid cols={3}>`.

### Props (`SpeciesProps`)

| Prop | Type | Required | Note |
|------|------|----------|------|
| `name` | `string` | **required** | Common name |
| `latin` | `string` | optional | Latin / scientific name (rendered in italics) |
| `when` | `string` | optional | When you will see it, e.g. `"Mar–May (autumn colour)"` |
| `where` | `string` | optional | Where along the route, e.g. `"rainforest gullies below 900 m"` |
| `image` | `string` | optional | Image path or URL |
| `alt` | `string` | optional | Image alt text; defaults to `name` |
| `likelihood` | `'common' \| 'occasional' \| 'rare'` | optional | How likely you are to encounter it |
| `accent` | `string` | optional | Colour override |
| `children` | `ReactNode` | optional | Short prose note |

### Example

```mdx
<TrailGrid cols={3}>
  <Flora name="Pandani" latin="Richea pandanifolia" when="year-round" where="rainforest gullies">
    The world's tallest heath, growing to 12 m. Its shaggy crown of strappy leaves is the defining silhouette of Tasmanian rainforest.
  </Flora>
  <Flora name="Deciduous beech" latin="Nothofagus gunnii" when="Mar–May (autumn colour)" where="above 900 m" likelihood="common" />
</TrailGrid>

<TrailGrid cols={3}>
  <Fauna name="Common wombat" latin="Vombatus ursinus" likelihood="common" where="button-grass moorland, around huts at dusk">
    Wombats are bold near the huts and often completely indifferent to walkers.
  </Fauna>
  <Fauna name="Platypus" latin="Ornithorhynchus anatinus" likelihood="occasional" where="Narcissus River, creek crossings" />
</TrailGrid>
```

---

## `<GearList>` / `<Gear>`

**Source:** `components/mdx/trailkit/gear.tsx`

`<Gear>` is a data-only element (renders `null`); `<GearList>` reads its children and groups them into a two-column checklist. Groups are rendered in fixed order: Worn → In the pack → Safety → Optional.

---

### `<GearList>` wrapper

| Prop | Type | Required | Note |
|------|------|----------|------|
| `children` | `ReactNode` | optional | `<Gear>` elements |
| `accent` | `string` | optional | Sets `--accent` for the checklist |

---

### `<Gear>` — `GearProps`

| Prop | Type | Required | Note |
|------|------|----------|------|
| `name` | `string` | **required** | Item name |
| `group` | `'worn' \| 'pack' \| 'safety' \| 'optional'` | optional | Checklist group; defaults to `'pack'` |
| `essential` | `boolean` | optional | Marks the item essential (accent dot + badge) |
| `note` | `ReactNode` | optional | Short note below the item name |

### Example

```mdx
<GearList>
  <Gear name="Waterproof shell" group="worn" essential />
  <Gear name="Merino base layer" group="worn" />
  <Gear name="4-season sleeping bag" group="pack" essential note="Nights can drop below zero even in February." />
  <Gear name="Fuel + stove" group="pack" note="Huts have gas, but carry your own for security." />
  <Gear name="PLB" group="safety" essential />
  <Gear name="First-aid kit" group="safety" essential />
  <Gear name="Gaiters" group="optional" />
  <Gear name="Microspikes" group="optional" note="Useful Sep–Oct when the plateau may still hold snow." />
</GearList>
```

---

## `<TrailGrid>`

**Source:** `components/mdx/trailkit/trail-grid.tsx`

Responsive grid wrapper for card components. Always use `not-prose` (already applied internally). Default is 2 columns.

### Props

| Prop | Type | Required | Note |
|------|------|----------|------|
| `children` | `ReactNode` | optional | Card components (`<Stop>`, `<Landmark>`, `<Flora>`, `<Fauna>`) |
| `cols` | `1 \| 2 \| 3` | optional | Column count at sm+ breakpoint; defaults to `2` |
| `className` | `string` | optional | Extra Tailwind classes applied to the grid wrapper |

### Example

```mdx
{/* 2-col (default) for huts */}
<TrailGrid>
  <Stop name="Waterfall Valley Hut" type="hut" />
  <Stop name="Windermere Hut" type="hut" />
</TrailGrid>

{/* 3-col for species cards */}
<TrailGrid cols={3}>
  <Flora name="Pandani" latin="Richea pandanifolia" />
  <Flora name="Deciduous beech" latin="Nothofagus gunnii" />
  <Flora name="King Billy pine" latin="Athrotaxis selaginoides" />
</TrailGrid>
```

---

## Quick-reference: prop name gotchas

These are the exact prop names from the source — common mis-spellings to avoid:

| Correct | Wrong |
|---------|-------|
| `elevationGainM` | `elevationGain`, `ascentTotal` |
| `maxAltitudeM` | `maxAltitude`, `highPointM` |
| `distanceKm` | `distance`, `km` |
| `extraAscentM` | `extraAscent`, `extraAscentMetres` |
| `extraTimeHours` | `extraTime`, `extraHours` |
| `difficultyDelta` | `deltaDifficulty`, `difficulty` |
| `ascentM` | `ascent`, `ascentMetres` |
| `descentM` | `descent`, `descentMetres` |
| `timeHours` | `time`, `hours` |
| `gearClass` | `gear`, `gearCategory` |
| `likelihood` | `frequency`, `probability` |

---

## Worked example

See `content/blog/overland-track-guide/index.mdx` — the full Overland Track guide exercises every component in the order recommended by the authoring workflow:

1. `<TrailSummary>` with `hike`, `season`, `gearClass`, `map`
2. `<TrailMap>` with `hike`
3. `<Stages>` → `<Stage>` → `<Checkpoint>`
4. `<Quest>` (one per major side trip)
5. `<TrailGrid>` → `<Stop>` (where you sleep)
6. `<TrailGrid>` → `<Landmark>` (notable features)
7. `<TrailGrid cols={3}>` → `<Flora>` (what grows here)
8. `<TrailGrid cols={3}>` → `<Fauna>` (what lives here)
9. `<GearList>` → `<Gear>` (what to carry)
