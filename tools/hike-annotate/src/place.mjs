// Merge geo-match + agy classification into the final annotated Asset (only the
// schema fields slot/caption/alt are persisted) plus a report sidecar (the rest).

/** Merge one asset. `geoMatch` = { waypoint, km } | null; `cls` = classifyImage result. */
export function placeAsset(asset, geoMatch, cls, validNames) {
  const slot = cls.waypoint && validNames.has(cls.waypoint) ? cls.waypoint : geoMatch?.waypoint || ''
  return {
    asset: { ...asset, slot, caption: cls.caption || asset.caption, alt: cls.alt || asset.alt },
    meta: {
      id: asset.id,
      slot,
      geoWaypoint: geoMatch?.waypoint || '',
      geoKm: geoMatch?.km ?? null,
      agyWaypoint: cls.waypoint || '',
      overrode: Boolean(cls.waypoint && geoMatch?.waypoint && cls.waypoint !== geoMatch.waypoint),
      sceneType: cls.sceneType,
      subjectTags: cls.subjectTags || [],
      caption: cls.caption || '',
      alt: cls.alt || '',
      quality: cls.quality ?? 0,
      heroWorthiness: cls.heroWorthiness ?? 0,
      skip: Boolean(cls.skip),
      needsManual: Boolean(cls.needsManual),
      reason: cls.reason || '',
      landscape: (asset.width || 0) >= (asset.height || 0),
      thumb: asset.thumb || asset.url,
      url: asset.url,
      takenAt: asset.takenAt || '',
    },
  }
}

/** Best hero asset id: highest heroWorthiness*quality among landscape, non-skip, classified. */
export function pickHero(metas) {
  const cands = metas.filter((m) => !m.skip && !m.needsManual && m.landscape)
  if (!cands.length) return null
  cands.sort((a, b) => b.heroWorthiness * b.quality - a.heroWorthiness * a.quality)
  return cands[0].heroWorthiness * cands[0].quality > 0 ? cands[0].id : null
}

/** Order gallery: kept photos chronological; skip/needsManual sink to the end. */
export function orderGallery(assets, metaById) {
  return [...assets].sort((a, b) => {
    const ma = metaById[a.id]
    const mb = metaById[b.id]
    const sa = ma.skip || ma.needsManual ? 1 : 0
    const sb = mb.skip || mb.needsManual ? 1 : 0
    if (sa !== sb) return sa - sb
    return String(a.takenAt).localeCompare(String(b.takenAt))
  })
}
