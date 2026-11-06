import type { Asset } from '@/lib/gen/content'

/** Read-only audit, 2026-11-05: these exact public image URLs were assigned to
 * both Alta Via 1 and Walker's Haute Route. No GPS or capture times are retained
 * here. This flags known source ambiguity; it does not reclassify/delete media.
 * A corrected gallery with replacement URLs does not inherit this notice. */
export const reviewedSharedAssetIds = [
  "1782650244631-img-2675",
  "1782650244632-img-2644",
  "1782650244633-img-2567",
  "1782650244634-img-2577",
  "1782650244635-img-2427",
  "1782650244636-img-2361",
  "1782650244637-img-2338",
  "1782650244638-img-2254",
  "1782650244639-img-2234",
  "1782650244640-img-2221",
  "1782650244641-img-2213",
  "1782650244642-img-2180",
  "1782650244643-img-2153",
  "1782650244644-img-2113",
  "1782650244645-img-2097",
  "1782650244646-img-2077",
  "1782650244647-img-1977",
  "1782650244648-img-1961",
  "1782650244649-img-1953",
  "1782650244650-img-1958",
  "1782650244651-img-1929",
  "1782650244652-img-1913",
  "1782650244653-img-1894",
  "1782650244654-img-1838",
  "1782650244655-img-1784",
  "1782650244656-img-1749",
  "1782650244657-img-1698",
  "1782650244658-img-1645",
  "1782650244659-img-1651",
  "1782650244660-img-1618",
  "1782650244661-img-1594",
  "1782650244662-img-1570",
  "1782650244663-img-1504",
  "1782650244664-img-1360",
  "1782650244665-img-1374",
  "1782650244666-img-1350",
  "1782650244667-img-1357",
  "1782650244668-img-1316",
  "1782650244669-img-1301",
  "1782650244670-img-1299",
  "1782650244671-img-1290",
  "1782650244672-img-1283",
  "1782650244673-img-1281",
  "1782650244674-img-1280",
  "1782650244675-img-1250",
  "1782650244676-img-1229",
  "1782650244677-img-1223",
  "1782650244678-img-1151",
  "1782650244679-img-1169",
  "1782650244680-img-1161",
  "1782650244681-img-1099"
] as const
const sharedUrls = new Set(reviewedSharedAssetIds.map(id => `https://storage.googleapis.com/benebsworth-hiking/assets/${id}.webp`))
export function galleryAssignmentNotice(slug: string, gallery: Asset[]) {
  return slug === 'dolomites-alta-via-1' && gallery.some(photo => sharedUrls.has(photo.url))
    ? 'Source check: this gallery includes photographs also published in the Walker’s Haute Route gallery. Their assignment to Alta Via 1 is unverified. Nearby areas describe photo locations, not the Alta Via route.'
    : null
}
