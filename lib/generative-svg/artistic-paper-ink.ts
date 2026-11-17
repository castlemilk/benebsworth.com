import { closePath as Z, cubicTo as C, lineTo as L, moveTo as M, type InkRole, type Mark, type PathCommand, type Point, type Study } from './definition'

const fill = (commands: readonly PathCommand[], role: InkRole = 'ink'): Mark => ({ kind: 'path', commands, paint: 'fill', role })
const stroke = (commands: readonly PathCommand[], role: InkRole = 'ink'): Mark => ({ kind: 'path', commands, paint: 'stroke', role, stroke: 'fine' })
const polygon = (points: readonly Point[], role: InkRole = 'ink'): Mark => fill([M(points[0]), ...points.slice(1).map(L), Z()], role)
const crease = (points: readonly Point[], role: InkRole = 'ink'): Mark => ({ kind: 'line', points, role, stroke: 'fine' })
const setting = (label: string) => [{ key: 'arrangement', label, min: 1, max: 3, step: 1, initial: 2 }]
const commonBasis = 'Original authored vector illustration in a 320 × 240 drawing space. All contours are explicit lines and cubic Bézier curves, with even-odd transparent cutouts rather than background-coloured paint. Three discrete compositions are curated drawing arrangements, not a physical simulation. Appearance never changes the authored geometry. Pen weight affects open crease/detail strokes only; solid silhouettes keep their contours.'

export const ARTISTIC_PAPER_INK: readonly Study[] = [
  {
    id: 'offset-portal', title: 'Offset portal', category: 'Illustration', provenance: 'illustrative',
    description: 'An architectural paper-cut: an open doorway, a vermilion side plane and a stair that slips beyond the frame. Choose a shallower or deeper arrangement.',
    basis: `${commonBasis} The front doorway, rear outlined slab and stair are layered pictorial planes with deliberate gaps. Their depth is an illustration convention, not a measured perspective or buildable structure.`,
    tags: ['bespoke-vector', 'cut-paper', 'architecture', 'negative-space'], aliases: ['paper doorway', 'architectural portal'],
    parameters: setting('Depth arrangement'),
    model: p => {
      const [dx, dy, right] = [[16, 10, 238], [28, 16, 248], [40, 22, 260]][p.arrangement - 1]
      const marks: Mark[] = []
      // Rear slab: outlined and airy, not an opaque backdrop behind the doorway.
      marks.push(crease([[66 + dx, 48 - dy], [right, 48 - dy], [right, 169 - dy], [222, 188 - dy]]))
      marks.push(crease([[66 + dx, 48 - dy], [66 + dx, 156 - dy]]))
      marks.push(polygon([[78, 52], [104, 42], [104, 180], [78, 198]]))
      // A complete front frame with a genuinely empty doorway. Same winding is intentional.
      marks.push(fill([M([104, 42]), L([214, 42]), L([214, 174]), L([104, 192]), Z(), M([122, 63]), L([192, 63]), L([192, 161]), L([122, 173]), Z()]))
      marks.push(polygon([[218, 45], [218 + dx, 45 - dy], [218 + dx, 163 - dy], [218, 174]], 'accent'))
      // Three independently shaped treads descend to the right, with thin riser cues.
      marks.push(polygon([[126, 177], [192, 166], [204, 172], [139, 184]]))
      marks.push(polygon([[145, 190], [209, 178], [221, 184], [158, 197]]))
      marks.push(polygon([[164, 203], [226, 190], [238, 196], [178, 210]]))
      marks.push(crease([[141, 187], [141, 192], [151, 198]]), crease([[160, 200], [160, 205], [169, 211]]))
      marks.push(crease([[81, 64], [96, 58], [96, 170]]), crease([[111, 51], [203, 51]]))
      marks.push(crease([[230, 60 - dy], [230, 140 - dy]], 'accent'))
      // Detached registration-like scraps belong to the illustration, not optional guides.
      marks.push(polygon([[57, 158], [64, 154], [64, 181], [57, 185]]), crease([[52, 195], [69, 187]]))
      marks.push(crease([[253, 201], [267, 194]]), crease([[257, 208], [271, 201]]))
      return { marks }
    },
  },
  {
    id: 'folded-horizon', title: 'Folded horizon', category: 'Illustration', provenance: 'illustrative',
    description: 'Broad folded planes meet a fine open edge. A high left peak and a small detached counterweight give this paper landscape an uneven rhythm.',
    basis: `${commonBasis} Each fold arrangement changes the peak, valley and underside separately. The folds suggest an imaginary landscape and do not describe a physical origami construction or terrain model.`,
    tags: ['bespoke-vector', 'cut-paper', 'landscape', 'folds'], aliases: ['paper horizon', 'angular folded landscape'],
    parameters: setting('Fold arrangement'),
    model: p => {
      const [peak, valley, lift] = [[78, 143, 168], [62, 132, 178], [48, 151, 160]][p.arrangement - 1]
      const marks: Mark[] = [
        polygon([[30, 156], [103, peak], [135, valley], [77, 171]]),
        polygon([[111, peak + 3], [202, 133], [144, valley - 3]]),
        polygon([[83, 177], [142, valley + 6], [201, 141], [169, lift]], 'accent'),
        polygon([[178, lift + 2], [208, 145], [259, 164], [228, 189]]),
        polygon([[268, 157], [290, 142], [283, 179]]),
        crease([[33, 166], [73, 181], [160, lift + 8]]),
        crease([[113, peak - 8], [214, 126], [259, 153]]),
        crease([[115, peak + 17], [145, valley - 13], [185, 132]]),
        crease([[190, lift + 2], [224, 180], [247, 165]]),
        crease([[265, 185], [280, 192], [294, 177]]),
      ]
      // Uneven incisions reinforce a cut-paper edge, rather than a generic wireframe.
      for (let i = 0; i < 7; i++) marks.push(crease([[43 + i * 5, 150 - i * 5.8], [48 + i * 5, 150 - i * 5.8]]))
      marks.push(crease([[188, 186], [199, 190]]), crease([[204, 192], [214, 195]]), crease([[130, 184], [146, 189]], 'accent'))
      return { marks }
    },
  },
  {
    id: 'interrupted-flourish', title: 'Interrupted flourish', category: 'Illustration', provenance: 'illustrative',
    description: 'A broad ink sweep folds back on itself, breaks, then ends in a sharp rising flick. A separate inner curl, a cut channel and a red counterstroke keep the gesture open.',
    basis: `${commonBasis} The three tension arrangements move the loop shoulder, returning fold and terminal flick independently. The lower returning stroke has an even-odd cut channel; the floating inner curl is a separate positive stroke. The open centre and cut channel remain transparent on any surface. The work is an authored calligraphic gesture, not a font character or recorded brush simulation.`,
    tags: ['bespoke-vector', 'expressive-ink', 'calligraphic', 'gesture'], aliases: ['broken ink sweep', 'brush flourish'],
    parameters: setting('Gesture tension'),
    model: p => {
      const [shoulder, fold, flick] = [[54, 181, 58], [42, 172, 43], [62, 193, 29]][p.arrangement - 1]
      return { marks: [
        fill([M([28, 159]), C([71, 142], [73, shoulder], [132, shoulder]), C([187, shoulder], [210, 89], [181, 130]), C([159, 160], [115, 176], [104, fold]), C([140, 183], [197, 156], [219, 131]), L([234, 131]), C([212, 170], [149, 206], [105, 198]), C([72, 192], [96, 165], [125, 148]), C([158, 128], [186, 105], [171, 77]), C([151, 49], [108, 72], [89, 109]), C([72, 143], [50, 161], [28, 159]), Z(),
          M([114, 183]), C([144, 178], [171, 165], [188, 152]), C([167, 174], [137, 188], [114, 183]), Z()]),
        fill([M([97, 116]), C([113, 84], [137, 66], [156, 76]), C([129, 77], [114, 102], [97, 116]), Z()]),
        fill([M([243, 128]), C([259, 101], [271, 77], [287, flick]), C([278, 94], [272, 123], [253, 145]), Z()]),
        fill([M([40, 183]), C([86, 203], [162, 207], [205, 187]), C([166, 216], [86, 214], [40, 183]), Z()], 'accent'),
        fill([M([224, 178]), C([239, 170], [254, 155], [261, 150]), C([251, 172], [242, 182], [224, 178]), Z()], 'accent'),
        stroke([M([36, 146]), C([58, 132], [69, 111], [76, 98])]),
        stroke([M([195, 73]), C([203, 87], [200, 102], [195, 113])]),
        stroke([M([260, 136]), C([273, 119], [279, 101], [282, 86])]),
        polygon([[74, 62], [82, 54], [78, 67]]), polygon([[65, 72], [70, 67], [69, 77]]),
        crease([[30, 173], [40, 177]], 'accent'),
        stroke([M([116, 60]), C([130, 54], [142, 53], [150, 57])]),
        polygon([[218, 114], [224, 105], [225, 116]]),
      ] }
    },
  },
  {
    id: 'rising-ember', title: 'Rising ember', category: 'Illustration', provenance: 'illustrative',
    description: 'A hooked central tongue, an open side stroke and a red shard rise at different speeds. The silhouette is deliberately asymmetric and interrupted.',
    basis: `${commonBasis} Three lean arrangements independently reshape the main hook, its interior cutout and the detached side stroke. Flame-like imagery is purely decorative; no combustion, temperature or flow field is represented.`,
    tags: ['bespoke-vector', 'expressive-ink', 'silhouette', 'gesture'], aliases: ['ink ember', 'hooked flame illustration'],
    parameters: setting('Ember lean'),
    model: p => {
      const [tip, shoulder, side] = [[165, 181, 213], [182, 192, 223], [199, 202, 233]][p.arrangement - 1]
      return { marks: [
        fill([M([132, 213]), C([103, 192], [119, 153], [146, 123]), C([174, 91], [157, 58], [tip, 25]), C([tip - 3, 62], [shoulder + 18, 83], [shoulder, 120]), C([177, 150], [136, 172], [148, 199]), C([157, 205], [164, 206], [169, 209]), C([156, 219], [143, 218], [132, 213]), Z(),
          M([139, 191]), C([126, 168], [164, 141], [174, 117]), C([172, 151], [145, 169], [139, 191]), Z()]),
        fill([M([105, 197]), C([76, 169], [81, 131], [117, 108]), C([103, 134], [98, 160], [110, 182]), Z()]),
        fill([M([174, 193]), C([182, 163], [side, 145], [side + 7, 95]), C([side + 15, 130], [213, 176], [174, 193]), Z()], 'accent'),
        fill([M([169, 78]), C([153, 63], [151, 49], [158, 38]), C([156, 56], [168, 63], [169, 78]), Z()]),
        stroke([M([118, 201]), C([109, 185], [112, 165], [122, 151])]),
        stroke([M([184, 138]), C([193, 126], [201, 109], [195, 92])]),
        stroke([M([184, 204]), C([207, 193], [222, 178], [229, 164])], 'accent'),
        polygon([[100, 92], [110, 75], [110, 94], [104, 101]]),
        polygon([[218, 72], [227, 54], [226, 77]], 'accent'),
        polygon([[88, 116], [93, 108], [92, 121]]),
        crease([[110, 215], [119, 218]]), crease([[191, 213], [201, 207]], 'accent'),
        stroke([M([126, 110]), C([139, 100], [146, 85], [143, 76])]),
        stroke([M([98, 154]), C([97, 146], [99, 138], [103, 132])]),
        polygon([[204, 47], [208, 37], [211, 44]]),
      ] }
    },
  },
]
