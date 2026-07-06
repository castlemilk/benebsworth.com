---
title: The Overland Track in winter — a trail guide
date: 2026-06-29T00:00:00.000Z
description: >-
  Tasmania's great alpine walk in the quiet of winter: eight days from Cradle
  Mountain to Lake St Clair, walking through snow, summiting side peaks, and
  staying in the empty huts.
labels: 'hiking, trail-guide'
release: true
heroImage: /blog/overland-track-guide/hero.webp
takeaways:
  - >-
    The Overland Track is usually a six-day summer walk, but in winter it
    becomes a slower, snowier, far quieter trip. Give yourself eight days if you
    want to climb the side peaks without rushing.
  - >-
    Black ice, hard snow and short days change the rhythm. Microspikes and a
    four-season sleeping bag are not optional; neither is patience when the
    shuttle can't run.
  - >-
    The side trips are the reason you come. Mount Oakleigh at sunrise, Mount
    Ossa on a clear day, and a frozen Lake Windermere reflecting Barn Bluff were
    the moments that stuck.
markdown_url: /blog/overland-track-guide/
canonical_url: 'https://benebsworth.com/blog/overland-track-guide/'
---
## Key takeaways

- The Overland Track is usually a six-day summer walk, but in winter it becomes a slower, snowier, far quieter trip. Give yourself eight days if you want to climb the side peaks without rushing.
- Black ice, hard snow and short days change the rhythm. Microspikes and a four-season sleeping bag are not optional; neither is patience when the shuttle can't run.
- The side trips are the reason you come. Mount Oakleigh at sunrise, Mount Ossa on a clear day, and a frozen Lake Windermere reflecting Barn Bluff were the moments that stuck.

I walked the Overland Track in mid-winter, at the end of July, when the booking quota is gone, the huts are almost empty, and the track can feel like it belongs to the people on it. A few weeks earlier I had used a six-hour hike up Mount Riddell, just outside Melbourne, as a warm-up. It was not enough. I was under-trained and a little de-conditioned, and I knew it. The one thing I had sorted was footwear: a pair of [Meindl Guffert boots](https://meindl.com.au/collections/all-mens-boots/products/guffert) that turned out to be worth every dollar on the frozen boardwalks and icy rock of the plateau.

The standard Overland is a one-way, six-day summer traverse from Ronny Creek to Narcissus Hut, where most people ferry down Lake St Clair. In winter the days are short, the side trips take longer, and the huts are cold enough that you want to arrive with light left to make dinner. I stretched it to eight days, added two nights at Kia Ora, and would do the same again.

> [TrailSummary component] Hero "at a glance" card for a trail guide. Shows the headline stats (distance, days on trail, total ascent, high point) with icons, a derived or explicit difficulty band (easy → extreme, trail-grade colour), and optional season window and gear class. An expandable "more" panel reveals secondary figures (avg km/day, ascent/day). The `hike` prop auto-binds the stats and accent colour from content/hiking.ts; an optional inline mini route map can be shown. The rendered post has the live, interactive card.

## The route

The track runs south through the heart of Cradle Mountain–Lake St Clair National Park, a slice of the Tasmanian Wilderness World Heritage Area. You start in the button-grass flats of Cradle Valley, climb onto the alpine plateau on the first morning, then spend the next week traversing south: across moorland and tarns, through myrtle-beech rainforest, over the exposed saddle of Pelion Gap, beneath the Du Cane Range, and finally down to Lake St Clair. In winter the shape of the country does not change, but the colour does — snow on the dolerite, ice on the boardwalks, and the track reduced to a thin line between white hills.

> [TrailMap component] Bespoke route map for a hike — a stylised topographic plate (not a geographic map) showing the trail as a smooth line through numbered waypoints over a faint contour backdrop, with a peak marker on the high point and an elevation-profile strip beneath. Driven by the hike's normalised waypoints and per-hike accent colour. The `hike` prop names a hike from content/hiking.ts to auto-bind its waypoints; alternatively pass explicit `waypoints`. The rendered post has the live, hoverable version.

## Day by day

These six stages are the spine of the route, but the numbers below reflect my winter timing — longer days, slower walking, and side trips folded in. If you are walking the standard summer itinerary you can compress days two and three, and skip the extra night at Kia Ora.

> [Stages component] Wrapper for an ordered list of <Stage> day-segments, rendered as a vertical timeline with a topographic contour spine. Use it to lay out a trail day by day.

<Stage day={1} from="Ronny Creek" to="Waterfall Valley" distanceKm={10.7} ascentM={520} descentM={300} timeHours="5–7 h" terrain="Boardwalk, icy rock, and the steep climb onto the Cradle plateau.">

The shuttle from Launceston was meant to drop us at Ronny Creek around 6 am, but black ice had closed the road beyond the information centre. We walked the extra kilometre or so to the trailhead in the half-dark, boots crunching on frozen gravel. It was a rough start, but it also meant I met the group I would walk with for the rest of the trip: three friends and two of their sons, all of them faster and funnier than I had any right to hike with.

I had worried about deep Tasmanian winter snow — stories of walkers post-holing for days — but the cover was light and beautiful, more like a hard frost than an alpine blizzard. A little rain and snow fell in the first hour, then the sky cleared. We stopped at the Overland Track signpost for the obligatory photo, then climbed past Crater Lake and up the chained pitch to Marions Lookout.

> [TrailFigure component] A real-photo figure for a trail guide: a single bordered photo (a co-located path or an absolute GCS URL) with an optional accent meta eyebrow (e.g. "Day 3 · Pas de Chèvres"), a caption and a credit. The photo-led counterpart to the researched Landmark/Stop cards — drop one inline for a single beat, or wrap several in a <TrailGrid> for a 2-up strip of trip photos. The rendered post shows the actual image.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

Beyond Kitchen Hut the track crosses the open plateau and drops into Waterfall Valley. We arrived at the hut in the late afternoon, around 4 or 5 pm, with enough time to make a proper dinner and settle in before the temperature dropped. The hut was empty except for our group. I made coffee on the bench and watched the light fade off Barn Bluff.

> [TrailFigure component] A real-photo figure for a trail guide: a single bordered photo (a co-located path or an absolute GCS URL) with an optional accent meta eyebrow (e.g. "Day 3 · Pas de Chèvres"), a caption and a credit. The photo-led counterpart to the researched Landmark/Stop cards — drop one inline for a single beat, or wrap several in a <TrailGrid> for a 2-up strip of trip photos. The rendered post shows the actual image.

</Stage>

<Stage day={2} from="Waterfall Valley" to="Lake Windermere" distanceKm={7.8} ascentM={150} descentM={250} timeHours="3–5 h" terrain="Gentle moorland, frozen boardwalk, and a short drop to the lake.">

I slept better than expected and woke up feeling fresh. That lasted about ten minutes. The track out of Waterfall Valley was sheet ice in patches, and before I had properly woken up I slipped, landed hard on my knee, and spent the next few minutes sitting in the snow waiting for the pain to tell me how bad it was.

It was bad enough that my first thought was the Garmin inReach Mini 2 in my pack and whether this was the helicopter moment. After a rest, a check of the joint, and some very careful walking, it seemed stable. I decided to push on slowly. The knee swelled over the next two days, but it held. I was lucky: the fall missed my patella and did no real structural damage.

> [TrailFigure component] A real-photo figure for a trail guide: a single bordered photo (a co-located path or an absolute GCS URL) with an optional accent meta eyebrow (e.g. "Day 3 · Pas de Chèvres"), a caption and a credit. The photo-led counterpart to the researched Landmark/Stop cards — drop one inline for a single beat, or wrap several in a <TrailGrid> for a 2-up strip of trip photos. The rendered post shows the actual image.

We stopped for lunch beside a half-frozen lake with Barn Bluff rising behind it, then continued on to Lake Windermere Hut. That afternoon, with the knee throbbing and the day still clear, I waded into the lake. It was July in Tasmania, so "swim" is a generous word — more of a gasp, a float, and a rapid exit. But the cold took the swelling down better than anything in my first-aid kit, and the reset was worth the shock.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

</Stage>

<Stage day={3} from="Lake Windermere" to="New Pelion" distanceKm={16.8} ascentM={300} descentM={420} timeHours="5–7 h" terrain="Long moorland traverse, then rainforest down to Frog Flats and back up to Pelion Plains.">

I gave myself a rest morning at Windermere. The lake was perfectly still at dawn, and Barn Bluff was reflected in the dark water with a clarity that made the early start feel easy. I took more photos than I needed, then packed up and left with the group in mid-morning.

> [TrailFigure component] A real-photo figure for a trail guide: a single bordered photo (a co-located path or an absolute GCS URL) with an optional accent meta eyebrow (e.g. "Day 3 · Pas de Chèvres"), a caption and a credit. The photo-led counterpart to the researched Landmark/Stop cards — drop one inline for a single beat, or wrap several in a <TrailGrid> for a 2-up strip of trip photos. The rendered post shows the actual image.

The longest day of the standard route, but not the hardest. The track runs south across open moor, drops through myrtle-beech rainforest to Frog Flats — the lowest point on the whole walk — and then climbs gently back to Pelion Plains. Mount Oakleigh's dolerite organ pipes come into view long before you reach the hut, and they dominated the evening light.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

</Stage>

<Stage day={4} from="New Pelion" to="Kia Ora" distanceKm={8.6} ascentM={300} descentM={300} timeHours="4–6 h" terrain="Rainforest climb to Pelion Gap, then down to Kia Ora.">

This was the day I built the trip around. I left New Pelion before dawn to climb Mount Oakleigh for sunrise, reaching the summit while the light was still thin and pink. There was enough phone reception at the top for one brief call, and I used it to call my then-girlfriend — now wife — Jess. It felt like a small miracle, a private conversation from the top of a mountain in the middle of Tasmania.

By the time I got back to the hut the group was ready to move. We packed up, climbed through rainforest to Pelion Gap, and dropped down to Kia Ora Hut in the early afternoon. The gap itself is a wind-scoured saddle between Mount Ossa and Mount Pelion East, and the junction signposts point off in three directions: up, up, and down.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

</Stage>

<Stage day={5} from="Kia Ora" to="Bert Nichols (Windy Ridge)" distanceKm={9.6} ascentM={300} descentM={350} timeHours="4–5 h" terrain="Waterfall side trips, Du Cane Gap, and descent to Windy Ridge.">

It was my birthday, and I did not remember until I got back to the hut. I spent the morning on a double side-quest: Mount Ossa first, then Mount Pelion East, returning to Kia Ora for lunch and a rest before pushing on. That is only possible if you are staying at Kia Ora a second night, which I was — it made the day feel generous rather than rushed.

Mount Ossa is the reason many people walk the Overland. It is Tasmania's highest summit at 1,617 metres, and on a clear day the view takes in most of the park's named peaks. The route from Pelion Gap climbs through a scree gully and finishes on exposed boulders; under snow the rock is slick, and the drop on either side is real. Mount Pelion East is shorter and quieter, a good second summit if the legs are willing.

After lunch we packed up and walked the waterfall section of the main track: past Du Cane Hut and the short detours to D'Alton, Fergusson and Hartnett Falls, then over Du Cane Gap and down to Bert Nichols Hut. The falls were running hard after winter rain, and the forest was thick with mist.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

</Stage>

<Stage day={6} from="Bert Nichols" to="Narcissus · Lake St Clair" distanceKm={9.0} ascentM={120} descentM={330} timeHours="3 h" terrain="Mostly downhill forest walk to the lake shore.">

The last morning was easy walking through forest to Narcissus Hut. I had planned to walk the full lakeshore track to Cynthia Bay, but the group was taking the ferry and I decided to join them. The lakeshore route is reputedly muddy and less well maintained, and after eight days — and a bruised knee — the ferry was the smarter finish. It also gave us time to make the shuttle back to Launceston and find a proper meal.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

> [Checkpoint component] Inline milestone/checkpoint marker, usable in prose or inside a <Stage>: an icon (pass, summit, water, junction, viewpoint, camp, hut or generic milestone), a name, an optional altitude, and an optional note. Marks the key points along a day's walk.

We landed back in Launceston in the early evening, dirty and tired, and went straight to a restaurant for the kind of meal that only tastes that good at the end of a long walk. I cannot remember what I ordered; I remember the relief.

> [TrailFigure component] A real-photo figure for a trail guide: a single bordered photo (a co-located path or an absolute GCS URL) with an optional accent meta eyebrow (e.g. "Day 3 · Pas de Chèvres"), a caption and a credit. The photo-led counterpart to the researched Landmark/Stop cards — drop one inline for a single beat, or wrap several in a <TrailGrid> for a 2-up strip of trip photos. The rendered post shows the actual image.

</Stage>

## Side trips

The main track is the skeleton; the side trips are the reason you carry a light day pack. In winter they take longer and demand better weather, but the emptiness of the huts means you can schedule rest days around them.

> [Quest component] A "side-quest" card: an optional detour or side-trip off the main trail (a side summit, a hidden gorge), framed playfully but informatively with the extra distance, ascent and time it costs, how much harder it is, and the payoff for doing it.

Leaves from Pelion Gap on the climb up from New Pelion. The route contours around Mount Doris, then climbs a scree gully and finishes on exposed boulders. Under snow the boulders are treacherous — save it for a settled, clear day. I combined it with Mount Pelion East in a single long birthday morning, but most walkers should allow a full day.

> [Quest component] A "side-quest" card: an optional detour or side-trip off the main trail (a side summit, a hidden gorge), framed playfully but informatively with the extra distance, ascent and time it costs, how much harder it is, and the payoff for doing it.

Also from Pelion Gap. The route is shorter and less committing than Ossa, which makes it a good second summit if you have the legs and the weather. I tagged it after Ossa on the same morning and was back at Kia Ora for lunch.

> [Quest component] A "side-quest" card: an optional detour or side-trip off the main trail (a side summit, a hidden gorge), framed playfully but informatively with the extra distance, ascent and time it costs, how much harder it is, and the payoff for doing it.

A pre-dawn climb from New Pelion Hut. The summit is lower than Ossa but the morning light on the dolerite pipes and the view back toward the plateau make it feel like the best-kept secret of the walk. There was enough reception at the top for a phone call, which is not something I expected in the Tasmanian wilderness.

> [Quest component] A "side-quest" card: an optional detour or side-trip off the main trail (a side summit, a hidden gorge), framed playfully but informatively with the extra distance, ascent and time it costs, how much harder it is, and the payoff for doing it.

The dark peak that dominates the first two days. The side trip leaves from near Waterfall Valley Hut and involves some boulder scrambling near the top. In winter the upper mountain holds snow and the rock is slick; fine weather only.

> [Quest component] A "side-quest" card: an optional detour or side-trip off the main trail (a side summit, a hidden gorge), framed playfully but informatively with the extra distance, ascent and time it costs, how much harder it is, and the payoff for doing it.

Best done as an extra night rather than a day trip. The turn-off is about 5 km before Narcissus. I skipped it this time, but it is the obvious reason to come back.

## Where you sleep

The huts are unstaffed, unheated, and run on a first-come basis within your track booking. In winter they are rarely full, but the cold is the real constraint — carry a four-season bag, a full sleeping kit, and a stove regardless of whether you plan to tent. The platforms outside are for overflow in summer; in winter you want to be inside.

> [TrailGrid component] Responsive grid wrapper (1–3 columns) for laying out Stop / Landmark / Flora / Fauna cards side by side.

> [Stop component] Accommodation card for a trail guide: a hut, rifugio, campsite, hotel, bivvy or refuge, with an icon, altitude, capacity, water/meals flags, a booking note and a description. Where you sleep along the route.

> [Stop component] Accommodation card for a trail guide: a hut, rifugio, campsite, hotel, bivvy or refuge, with an icon, altitude, capacity, water/meals flags, a booking note and a description. Where you sleep along the route.

> [Stop component] Accommodation card for a trail guide: a hut, rifugio, campsite, hotel, bivvy or refuge, with an icon, altitude, capacity, water/meals flags, a booking note and a description. Where you sleep along the route.

> [Stop component] Accommodation card for a trail guide: a hut, rifugio, campsite, hotel, bivvy or refuge, with an icon, altitude, capacity, water/meals flags, a booking note and a description. Where you sleep along the route.

> [Stop component] Accommodation card for a trail guide: a hut, rifugio, campsite, hotel, bivvy or refuge, with an icon, altitude, capacity, water/meals flags, a booking note and a description. Where you sleep along the route.

> [Stop component] Accommodation card for a trail guide: a hut, rifugio, campsite, hotel, bivvy or refuge, with an icon, altitude, capacity, water/meals flags, a booking note and a description. Where you sleep along the route.

## Landmarks

> [TrailGrid component] Responsive grid wrapper (1–3 columns) for laying out Stop / Landmark / Flora / Fauna cards side by side.

<Landmark name="Cradle Mountain" kind="summit" elevM={1545} bearing="N from the start">
The serrated skyline that gives the park its name. The summit scramble from Kitchen Hut is harder under snow; many winter walkers skip it.
</Landmark>

<Landmark name="Barn Bluff" kind="summit" elevM={1559} bearing="S of Cradle">
The blunt cone that dominates the first two days. Photogenic from almost every angle, especially reflected in the lakes near Waterfall Valley and Windermere.
</Landmark>

<Landmark name="Mount Ossa" kind="summit" elevM={1617} bearing="W of Pelion Gap">
Tasmania's highest mountain and the high point of the walk. A clear-day scramble from Pelion Gap.
</Landmark>

<Landmark name="Mount Oakleigh" kind="summit" elevM={1280} bearing="N over Pelion">
The dolerite wall above New Pelion Hut. The sunrise summit is one of the best on the track.
</Landmark>

<Landmark name="Lake Windermere" kind="lake" bearing="Day 2">
A small alpine lake that freezes at the edges in winter. The reflections of Barn Bluff at dawn are worth a rest day.
</Landmark>

<Landmark name="Lake St Clair" kind="lake" elevM={737} bearing="S terminus">
The deepest natural lake in Australia. The ferry from Narcissus is the traditional finish.
</Landmark>

## What grows here

This is Gondwanan country, and in winter it strips down to its structure: snow on the dolerite, dark green myrtle-beech in the gullies, and the pale trunks of pencil pines against the white hills.

> [TrailGrid component] Responsive grid wrapper (1–3 columns) for laying out Stop / Landmark / Flora / Fauna cards side by side.

<Flora name="Pandani" latin="Richea pandanifolia" when="Year-round" where="Crater Lake, rainforest edges">
The tallest heath plant in the world, a shaggy palm-like crown of strappy leaves that looks tropical and is anything but.
</Flora>

<Flora name="Deciduous beech (fagus)" latin="Nothofagus gunnii" when="Colour in late April" where="Alpine slopes, tarn shelves">
Australia's only winter-deciduous native tree. In late April its leaves turn gold and rust in "the turning of the fagus".
</Flora>

<Flora name="King Billy pine" latin="Athrotaxis selaginoides" when="Year-round" where="Sheltered rainforest gullies">
A Gondwanan conifer; some standing on the track are more than a thousand years old.
</Flora>

<Flora name="Pencil pine" latin="Athrotaxis cupressoides" when="Year-round" where="Alpine lake edges">
Pale-barked and slow-growing, often the only tree around the frozen tarns of the central plateau.
</Flora>

<Flora name="Button grass" latin="Gymnoschoenus sphaerocephalus" when="Year-round" where="Open moorland plains">
The tussocky sedge that carpets the plains between the high points.
</Flora>

<Flora name="Myrtle beech" latin="Nothofagus cunninghamii" when="Year-round" where="Temperate rainforest">
The backbone of the cool temperate rainforest below Frog Flats and the Du Cane Range.
</Flora>

## What lives here

Most animals keep a low profile in winter, but the huts still attract black currawongs, and wombat tracks crisscross the snow around Ronny Creek at dawn.

> [TrailGrid component] Responsive grid wrapper (1–3 columns) for laying out Stop / Landmark / Flora / Fauna cards side by side.

<Fauna name="Common wombat" latin="Vombatus ursinus" likelihood="common" where="Ronny Creek, trailsides at dusk">
The most reliable large sighting. Give them room and they will keep cropping grass beside the boardwalk.
</Fauna>

<Fauna name="Bennett's wallaby" latin="Notamacropus rufogriseus" likelihood="common" where="Open moorland, around huts">
Often around the huts at dusk, with a rufous neck and dark face stripe.
</Fauna>

<Fauna name="Tasmanian pademelon" latin="Thylogale billardierii" likelihood="common" where="Forest edges, hut clearings">
A small, round, short-tailed wallaby endemic to Tasmania.
</Fauna>

<Fauna name="Short-beaked echidna" latin="Tachyglossus aculeatus" likelihood="occasional" where="Open woodland and moorland">
A spiny monotreme often seen pottering across the track in daylight.
</Fauna>

<Fauna name="Black currawong" latin="Strepera fuliginosa" likelihood="common" where="Huts and campsites">
A large, glossy-black, yellow-eyed bird endemic to Tasmania. It will open zips and lids — seal your food.
</Fauna>

<Fauna name="Tasmanian devil" latin="Sarcophilus harrisii" likelihood="rare" where="Nocturnal, forested sections">
More often heard than seen. A sighting is a rare privilege.
</Fauna>

## Gear

Winter changes the kit list. Snow, ice and sub-zero hut nights are the baseline, not the exception. The four-season sleeping bag is non-negotiable, and so is the ability to make hot food and drinks in a hut with no cooking facilities.

> [GearList component] Gear checklist for the trail, grouped into Worn / In the pack / Safety / Optional. Each <Gear> item can be flagged essential and carry a short note. Renders as a two-column grouped list.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

> [Gear component] A single gear item inside a <GearList> (name, group, essential flag, note). Data-only — it is rendered by its parent <GearList>.

The Overland in winter is not the same walk as the Overland in summer. It is slower, colder, and emptier. The side trips take longer, the days end earlier, and a slip on ice can turn a good morning into a serious decision. But the huts are quiet, the snow turns the plateau into something elemental, and the moments that matter — a sunrise on Mount Oakleigh, a frozen lake reflecting Barn Bluff, a phone call from a summit, a birthday spent climbing two mountains — feel earned in a way that fair-weather walking rarely does. Pack for the cold, give yourself the extra days, and say yes to the detours.
