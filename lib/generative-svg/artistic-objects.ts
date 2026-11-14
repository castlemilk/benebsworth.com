import { closePath as Z, cubicTo as C, lineTo as L, moveTo as M, type InkRole, type Mark, type PathCommand, type Point, type Study } from './definition'

const contour = (points: readonly Point[]): PathCommand[] => [M(points[0]), ...points.slice(1).map(L), Z()]
const fill = (commands: readonly PathCommand[], role: InkRole = 'ink'): Mark => ({ kind: 'path', commands, paint: 'fill', role })
const panel = (points: readonly Point[], role: InkRole = 'ink') => fill(contour(points), role)
const line = (points: readonly Point[]): Mark => ({ kind: 'path', commands: [M(points[0]), ...points.slice(1).map(L)], paint: 'stroke', stroke: 'fine', role: 'ink' })
const curve = (commands: readonly PathCommand[]): Mark => ({ kind: 'path', commands, paint: 'stroke', stroke: 'fine', role: 'ink' })
const basis = 'Original authored editorial vector, revision 1, with no external drawing input. Fixed 320 × 240 composition made from editable line and cubic contours. Even-odd holes and unpainted spaces are genuinely transparent. Appearance changes ink and fine stroke weight only, never coordinates. Suggestive objects are illustrative, not measured construction drawings.'

export const ARTISTIC_OBJECTS: readonly Study[] = [
  {
    id: 'index-cabinet', title: 'Index cabinet', category: 'Illustration', provenance: 'illustrative',
    description: 'A skewed archive cabinet with unequal drawers, open upper compartment, cut-through handle slots and a single red index card.',
    basis: `${basis} Layered front, side and top planes suggest an archive cabinet; the unequal compartments and projecting card are pictorial choices.`,
    tags: ['bespoke-vector', 'engraved-objects', 'intaglio-object', 'archive', 'negative-space'], aliases: ['archival drawers', 'card catalogue cabinet'], parameters: [],
    model: () => {
      // Direction: a dark left side anchors an airy front; the open top bay is the focal void.
      const marks: Mark[] = [
        curve(contour([[70, 57], [98, 42], [251, 56], [223, 72]])),
        fill([...contour([[70, 63], [88, 73], [88, 207], [70, 194]]), ...contour([[76, 84], [82, 88], [82, 180], [76, 176]])]),
        fill([...contour([[94, 74], [223, 79], [223, 207], [94, 216]]), ...contour([[102, 84], [214, 88], [214, 198], [102, 205]])]),
        line([[230, 78], [251, 64], [251, 190], [230, 203]]),
        line([[236, 83], [245, 77], [245, 182], [236, 188]]),
        panel([[101, 117], [215, 119], [215, 126], [101, 124]]),
        line([[107, 91], [202, 95], [202, 111]]), line([[108, 111], [195, 113]]),
        // The card is separate from the opening, leaving an honest transparent bay.
        panel([[156, 103], [184, 99], [202, 119], [172, 118]], 'accent'),
        fill([...contour([[105, 132], [154, 132], [154, 157], [105, 159]]), ...contour([[118, 140], [141, 140], [141, 148], [118, 149]])]),
        fill([...contour([[162, 132], [212, 133], [212, 156], [162, 157]]), ...contour([[175, 140], [199, 140], [199, 148], [175, 148]])]),
        fill([...contour([[105, 166], [212, 164], [212, 193], [105, 200]]), ...contour([[144, 174], [176, 173], [176, 183], [144, 185]])]),
        panel([[94, 220], [109, 219], [108, 227], [94, 228]]), panel([[207, 213], [222, 212], [222, 221], [209, 222]]),
        line([[112, 128], [147, 128]]), line([[169, 128], [205, 129]]), line([[108, 162], [148, 161]]), line([[169, 160], [207, 159]]),
        line([[113, 204], [148, 202]]), line([[181, 200], [210, 198]]),
      ]
      // Spaced incisions follow the top perspective and the tall side panel.
      for (let i = 0; i < 10; i++) marks.push(line([[94 + i * 12, 53 + i * 1.1], [105 + i * 12, 48 + i * 1.1]]))
      for (let i = 0; i < 12; i++) marks.push(line([[233, 91 + i * 7], [241, 86 + i * 7]]))
      return { marks }
    },
  },
  {
    id: 'signal-lantern', title: 'Signal lantern', category: 'Illustration', provenance: 'illustrative',
    description: 'An uneven hanging lantern with an angular cap, open tapered chamber, red inner shard and curling wall bracket.',
    basis: `${basis} The interior shard is a graphic light motif, with no optics, illumination or engineering model. The bracket and hanging link are expressive silhouettes.`,
    tags: ['bespoke-vector', 'engraved-objects', 'intaglio-object', 'lantern', 'negative-space'], aliases: ['hanging lantern', 'curled bracket lamp'], parameters: [],
    model: () => {
      // Direction: the long bracket leans into the left-heavy chamber; one spare shard interrupts its void.
      const marks: Mark[] = [
        fill([M([229, 31]), C([204, 17], [175, 22], [167, 44]), C([161, 60], [174, 70], [183, 62]), C([190, 56], [184, 47], [177, 50]), C([179, 39], [201, 30], [227, 40]), Z()]),
        line([[231, 35], [248, 35], [248, 111]]),
        fill([...contour([[251, 25], [263, 28], [263, 128], [251, 124]]), ...contour([[255, 42], [259, 43], [259, 108], [255, 107]])]),
        line([[246, 50], [224, 71], [202, 73]]), line([[245, 59], [228, 78], [211, 81]]),
        fill([M([167, 55]), C([150, 55], [144, 66], [151, 78]), L([160, 77]), C([152, 67], [156, 62], [168, 62]), Z()]),
        curve(contour([[111, 87], [150, 71], [184, 78], [213, 105], [165, 99]])),
        panel([[116, 88], [150, 75], [150, 81], [130, 91]]),
        line([[115, 82], [148, 66], [184, 73]]),
        panel([[104, 94], [161, 106], [216, 111], [213, 117], [160, 113], [104, 102]]),
        // A compound silhouette leaves the chamber empty, including in monochrome.
        fill([...contour([[107, 108], [211, 121], [193, 199], [126, 188]]), ...contour([[117, 119], [198, 129], [185, 187], [134, 179]])]),
        panel([[164, 120], [170, 121], [164, 182], [159, 181]]),
        panel([[126, 195], [191, 205], [184, 213], [130, 204]]),
        line([[136, 210], [179, 217]]),
        line([[216, 117], [224, 123], [206, 201], [193, 205]]),
        panel([[143, 171], [146, 142], [155, 157], [153, 178]], 'accent'),
        line([[178, 136], [188, 139], [180, 170]]),
        line([[123, 125], [128, 151]]), line([[173, 192], [183, 194]]),
        line([[132, 184], [153, 187]]), line([[108, 115], [117, 154]]),
      ]
      for (let i = 0; i < 9; i++) marks.push(line([[129 + i * 7, 86 + i * 1.5], [137 + i * 7, 82 + i * 1.5]]))
      for (let i = 0; i < 8; i++) marks.push(line([[215 - i * 1.7, 132 + i * 7], [220 - i * 1.7, 130 + i * 7]]))
      for (let i = 0; i < 5; i++) marks.push(line([[236 + i * 3, 37], [236 + i * 3, 43]]))
      return { marks }
    },
  },
  {
    id: 'mosaic-carafe', title: 'Mosaic carafe', category: 'Illustration', provenance: 'illustrative',
    description: 'A squat broad carafe with a lateral pouring lip, generous open handle and irregular large, medium and small inlaid panels.',
    basis: `${basis} The inlays follow a freely invented vessel silhouette. They imply decorative ceramic facets rather than a historical craft attribution or manufacturable design.`,
    tags: ['bespoke-vector', 'engraved-objects', 'inlaid-ornament', 'vessel', 'mosaic'], aliases: ['inlaid ceramic jug', 'mosaic pitcher'], parameters: [],
    model: () => {
      // Direction: broad quiet belly, jutting left lip, generous right counter and unequal mosaic scales.
      const marks: Mark[] = [
        fill([M([206, 91]), C([259, 69], [288, 112], [264, 153]), C([251, 175], [232, 179], [213, 173]), L([215, 160]), C([245, 170], [264, 134], [257, 116]), C([250, 98], [228, 103], [213, 111]), Z()]),
        fill([M([97, 79]), L([126, 78]), L([129, 61]), L([189, 65]), L([194, 89]), C([217, 108], [231, 134], [225, 165]), C([221, 195], [201, 213], [153, 214]), C([111, 214], [85, 201], [81, 174]), C([77, 150], [89, 123], [104, 108]), L([68, 91]), L([58, 70]), Z(),
          M([76, 81]), L([115, 88]), L([138, 86]), L([139, 71]), L([179, 75]), L([184, 96]), C([208, 114], [221, 140], [215, 164]), C([210, 191], [194, 204], [153, 204]), C([116, 204], [97, 195], [92, 172]), C([87, 147], [102, 121], [118, 107]), L([79, 91]), Z()]),
        curve([M([125, 54]), C([144, 47], [175, 49], [191, 57])]),
        line([[137, 60], [178, 64]]),
        // Unequal isolated facets sit within the open body, not on a painted background.
        panel([[126, 108], [155, 100], [151, 140], [108, 137]]),
        panel([[163, 102], [181, 105], [201, 127], [160, 139]], 'accent'),
        panel([[103, 146], [138, 149], [129, 179], [98, 166]]),
        panel([[148, 150], [177, 144], [188, 179], [139, 185]]),
        panel([[185, 140], [207, 134], [211, 159], [196, 174]]),
        panel([[102, 176], [126, 189], [123, 198], [109, 192]]),
        panel([[136, 195], [167, 191], [180, 199], [151, 200]]),
        panel([[192, 185], [204, 177], [199, 190], [187, 197]]),
        line([[116, 100], [132, 96], [151, 94]]),
        curve([M([233, 94]), C([255, 91], [273, 108], [269, 130])]),
        curve([M([237, 152]), C([248, 145], [253, 134], [253, 126])]),
        line([[68, 73], [88, 77]]), line([[92, 81], [106, 84]]),
      ]
      // Engraving occupies the ceramic seams and handle rather than filling every quiet panel.
      for (let i = 0; i < 7; i++) marks.push(line([[100 + i * 7, 140 + i * 0.4], [104 + i * 7, 145 + i * 0.4]]))
      for (let i = 0; i < 6; i++) marks.push(line([[141 + i * 7, 188 - i], [144 + i * 7, 192 - i]]))
      for (let i = 0; i < 6; i++) marks.push(line([[224 + i * 5, 97 - i * 0.5], [225 + i * 5, 102 - i * 0.5]]))
      marks.push(line([[91, 180], [96, 188]]), line([[97, 193], [105, 199]]), line([[201, 199], [208, 191]]))
      return { marks }
    },
  },
]
