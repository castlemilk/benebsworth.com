import { closePath as Z, cubicTo as C, lineTo as L, moveTo as M, type InkRole, type Mark, type PathCommand, type Point, type Study } from './definition'

const fill = (commands: readonly PathCommand[], role: InkRole = 'ink'): Mark => ({ kind: 'path', commands, paint: 'fill', role })
const stroke = (commands: readonly PathCommand[], role: InkRole = 'ink'): Mark => ({ kind: 'path', commands, paint: 'stroke', stroke: 'fine', role })
const contour = (points: readonly Point[]): PathCommand[] => [M(points[0]), ...points.slice(1).map(L), Z()]
const polygon = (points: readonly Point[], role: InkRole = 'ink'): Mark => fill(contour(points), role)
const line = (points: readonly Point[], role: InkRole = 'ink'): Mark => stroke([M(points[0]), ...points.slice(1).map(L)], role)
const basis = 'Original authored editorial vector illustration with no external traced source. Fixed composition in a 320 × 240 drawing space, using explicit lines and cubic Bézier contours and real even-odd transparent openings. Appearance changes ink and fine stroke weight only, never coordinates. No background is painted.'

export const ARTISTIC_PLACES: readonly Study[] = [
  {
    id: 'scalloped-fan', title: 'Scalloped fan', category: 'Illustration', provenance: 'illustrative',
    description: 'A broad scalloped fan gathers towards an off-centre hinge and diagonal handle. Unequal open panels hold chevrons, curling tendrils and carved inlays.',
    basis: `${basis} This invented carved ornament suggests a handheld fan; it is not a historical reconstruction or a claim about any cultural tradition. The panel openings and handle slot are actual cutouts.`,
    tags: ['bespoke-vector', 'inlaid-ornament', 'fan', 'negative-space'], aliases: ['carved fan', 'scalloped ornament'], parameters: [],
    model: () => {
      const marks: Mark[] = [
        // A single scalloped crown with unequal open windows, rather than separate radial badges.
        fill([M([39, 139]), C([27, 121], [35, 96], [59, 94]), C([54, 67], [74, 47], [99, 54]), C([106, 25], [137, 20], [156, 42]), C([180, 20], [212, 33], [214, 59]), C([246, 54], [266, 75], [255, 99]), L([221, 173]), C([216, 181], [206, 183], [199, 175]), Z(),
          M([50, 133]), C([42, 119], [47, 107], [62, 106]), L([184, 166]), Z(),
          M([73, 94]), C([65, 77], [79, 61], [96, 67]), L([189, 154]), Z(),
          M([111, 57]), C([116, 35], [139, 35], [149, 51]), L([200, 151]), Z(),
          M([166, 52]), C([184, 36], [204, 48], [202, 65]), L([213, 150]), Z(),
          M([217, 73]), C([241, 64], [255, 81], [244, 97]), L([225, 139]), Z()]),
        fill([...contour([[204, 182], [215, 178], [278, 207], [284, 216], [275, 222], [267, 220]]), ...contour([[229, 192], [264, 208], [262, 213], [227, 198]])]),
        fill([M([201, 171]), C([205, 166], [217, 166], [221, 172]), C([224, 180], [215, 186], [207, 182]), C([201, 180], [198, 176], [201, 171]), Z()], 'accent'),
        // Chevron inlays live inside the generous left panel aperture.
        line([[54, 117], [65, 114], [76, 122]]), line([[66, 128], [78, 124], [90, 132]]),
        line([[83, 137], [96, 134], [108, 141]]), line([[104, 146], [117, 144], [129, 151]]),
        // Second panel: a branch with alternating, unequal curled leaves.
        stroke([M([80, 78]), C([111, 101], [137, 121], [168, 141])]),
        stroke([M([99, 93]), C([86, 95], [83, 87], [88, 85])]),
        stroke([M([111, 102]), C([109, 92], [103, 84], [99, 86])]),
        stroke([M([123, 111]), C([108, 113], [104, 106], [108, 103])]),
        stroke([M([136, 120]), C([134, 110], [126, 103], [122, 103])]),
        stroke([M([148, 129]), C([137, 131], [132, 125], [134, 122])]),
        // Tall central opening: nested tapered carved tongues, deliberately discontinuous.
        fill([M([128, 49]), C([120, 64], [131, 80], [147, 92]), C([135, 71], [129, 62], [128, 49]), Z()]),
        stroke([M([137, 50]), C([151, 74], [163, 93], [176, 115])]),
        stroke([M([140, 87]), C([152, 105], [170, 123], [183, 134])]),
        polygon([[153, 92], [159, 99], [160, 110]]),
        polygon([[168, 118], [174, 123], [177, 132]], 'accent'),
        // Narrow right-hand opening: a growing stem and three open leaf curls.
        stroke([M([186, 53]), C([188, 80], [199, 104], [207, 127])]),
        stroke([M([190, 75]), C([177, 69], [174, 60], [181, 58])]),
        stroke([M([196, 92]), C([199, 81], [196, 75], [193, 73])]),
        stroke([M([201, 109]), C([190, 102], [186, 92], [189, 89])]),
        line([[226, 80], [235, 78], [239, 84], [234, 91], [225, 94]], 'accent'),
        line([[225, 102], [233, 98], [229, 109], [224, 113]]),
        // Edge engraving follows each scallop instead of arbitrary hatch fields.
        stroke([M([31, 139]), C([20, 118], [31, 94], [48, 89])]),
        stroke([M([56, 78]), C([60, 57], [75, 46], [90, 46])]),
        stroke([M([105, 38]), C([118, 22], [135, 20], [148, 29])]),
        stroke([M([169, 29]), C([187, 22], [205, 32], [212, 43])]),
        stroke([M([230, 55]), C([250, 57], [263, 68], [265, 80])]),
        line([[51, 145], [114, 162]]), line([[120, 164], [185, 178]]),
        line([[228, 164], [247, 124]]), line([[252, 114], [258, 102]]),
        line([[219, 185], [234, 192]], 'accent'), line([[269, 209], [274, 213]]),
        line([[272, 218], [277, 216]]), line([[199, 184], [204, 191], [219, 198]]),
      ]
      return { marks }
    },
  },
  {
    id: 'winding-quarter', title: 'Winding quarter', category: 'Illustration', provenance: 'illustrative',
    description: 'An imaginary oblique quarter of steep roofs, recessed courtyards and small stairways. An unpainted winding lane separates the clusters; one red awning marks a doorway.',
    basis: `${basis} Fictional architecture with compressed pictorial depth, not a map, a real settlement, a measured perspective or a buildable plan. Roof incisions follow individual planes. The lane is continuous empty space between separate buildings; courtyard holes are cut directly through their enclosing contours.`,
    tags: ['bespoke-vector', 'imagined-place', 'architecture', 'courtyard'], aliases: ['imaginary village', 'roof quarter', 'winding lane'], parameters: [],
    model: () => {
      const marks: Mark[] = [
        // Back-left house: a tall broken roofline, with an airy front wall.
        fill([...contour([[43, 77], [80, 39], [126, 56], [96, 89]]),
          ...contour([[80, 48], [118, 61], [115, 65], [77, 52]]),
          ...contour([[65, 67], [76, 55], [79, 57], [68, 69]]),
          ...contour([[76, 72], [85, 62], [88, 64], [79, 74]]),
          ...contour([[87, 77], [94, 69], [97, 71], [90, 79]])]),
        line([[48, 84], [48, 113], [94, 132], [94, 96]]),
        line([[102, 94], [127, 67], [127, 111], [102, 131]]),
        line([[57, 91], [57, 108], [69, 113], [69, 96], [57, 91]]),
        polygon([[78, 104], [87, 108], [87, 121], [78, 117]]),
        line([[110, 97], [119, 88], [119, 104], [110, 113], [110, 97]]),
        line([[45, 119], [91, 138], [127, 119]]),
        // Roof cutlines remain open gaps between roof masses, not white paint.
        line([[48, 70], [76, 40]]), line([[89, 35], [129, 50]]),
        polygon([[102, 43], [102, 28], [112, 31], [112, 47]]),
        line([[101, 24], [114, 28]]),
        // Rear right courtyard roof is a ring, with an actual open quadrilateral.
        fill([...contour([[184, 40], [230, 26], [271, 49], [222, 70]]), ...contour([[208, 43], [230, 36], [249, 48], [226, 58]])]),
        line([[185, 48], [185, 77], [220, 96], [220, 77]]),
        line([[229, 75], [270, 57], [270, 86], [229, 105], [229, 75]]),
        line([[194, 62], [206, 69], [206, 80], [194, 73], [194, 62]]),
        polygon([[238, 78], [248, 73], [248, 84], [238, 89]]),
        polygon([[256, 70], [263, 67], [263, 78], [256, 81]]),
        line([[215, 44], [227, 50], [238, 46]]),
        // Lower left courtyard: broad U-shaped mass, two disconnected sill cuts.
        fill([...contour([[29, 157], [68, 140], [113, 161], [75, 182]]), ...contour([[48, 158], [68, 150], [91, 161], [73, 172]])]),
        line([[31, 166], [31, 190], [73, 211], [73, 190]]),
        line([[82, 186], [111, 170], [111, 193], [82, 211], [82, 186]]),
        polygon([[40, 177], [49, 181], [49, 193], [40, 189]]),
        line([[57, 186], [65, 190], [65, 202], [57, 198], [57, 186]]),
        line([[89, 189], [103, 181]]), line([[89, 195], [103, 187]]),
        line([[35, 199], [68, 215]]),
        // Right middle house turns towards the lane. Awning is isolated from the roof.
        fill([...contour([[166, 123], [208, 91], [251, 113], [210, 145]]),
          ...contour([[208, 100], [241, 117], [237, 120], [204, 103]]),
          ...contour([[184, 120], [200, 108], [203, 110], [187, 122]]),
          ...contour([[195, 126], [211, 114], [214, 116], [198, 128]]),
          ...contour([[206, 132], [222, 120], [225, 122], [209, 134]])]),
        line([[166, 133], [166, 160], [207, 182], [207, 153]]),
        line([[217, 151], [251, 124], [251, 157], [217, 183], [217, 151]]),
        polygon([[169, 145], [186, 152], [196, 147], [179, 140]], 'accent'),
        line([[173, 153], [173, 164]]), line([[189, 160], [189, 172]]),
        line([[226, 151], [240, 140], [240, 152], [226, 163], [226, 151]]),
        line([[173, 119], [204, 96]]), line([[216, 92], [252, 109]]),
        // Front store, deliberately lower and set back from the lane outlet.
        fill([...contour([[145, 194], [176, 178], [213, 197], [182, 215]]),
          ...contour([[176, 185], [204, 199], [200, 202], [172, 188]]),
          ...contour([[165, 196], [173, 192], [184, 198], [176, 202]])]),
        line([[146, 201], [146, 212], [174, 227], [174, 218]]),
        line([[188, 219], [211, 205], [211, 216], [188, 230]]),
        // Two short stair flights attach to walls, leaving the central lane clear.
        line([[276, 90], [289, 97], [269, 107], [256, 101]]),
        line([[273, 97], [283, 102]]), line([[268, 101], [278, 106]]),
        line([[263, 105], [273, 110]]), line([[258, 109], [268, 114]]),
        line([[118, 169], [132, 176], [117, 185]]),
        line([[121, 177], [127, 180]]), line([[117, 182], [123, 185]]),
        // Recessed roof eaves, one visible roof ridge and masonry steps, no lane paving.
        line([[41, 82], [89, 100]]),
        line([[171, 136], [199, 151]]),
        line([[152, 209], [166, 216]]),
        line([[180, 82], [211, 100]]), line([[233, 113], [247, 106]]),
      ]
      return { marks }
    },
  },
  {
    id: 'harbour-rigging', title: 'Harbour rigging', category: 'Illustration', provenance: 'illustrative',
    description: 'A low workboat cuts diagonally across open water. An off-centre mast, furled sail, three different rigging groups and a small red pennant give its open upper half a taut rhythm.',
    basis: `${basis} An invented workboat vignette, not a vessel specification or an engineering or seaworthiness claim. The rigging groups are a forward fan of stays, an aft paired stay and short ladder-like shrouds. Their spacing and simplified attachments are pictorial. The hull ports are transparent cutouts.`,
    tags: ['bespoke-vector', 'imagined-place', 'boat', 'rigging'], aliases: ['workboat illustration', 'harbour boat', 'furled sail'], parameters: [],
    model: () => {
      const marks: Mark[] = [
        // Low diagonal hull with separate ports; its interior is never background paint.
        fill([M([36, 178]), C([100, 181], [216, 150], [286, 125]), C([274, 153], [250, 173], [219, 184]), L([91, 213]), C([66, 209], [47, 195], [36, 178]), Z(),
          ...contour([[80, 188], [98, 187], [99, 194], [83, 196]]),
          ...contour([[116, 183], [137, 179], [137, 187], [116, 192]]),
          ...contour([[155, 174], [176, 168], [175, 176], [155, 182]]),
          ...contour([[197, 161], [217, 155], [214, 164], [194, 170]]),
          ...contour([[238, 148], [258, 140], [251, 151], [232, 158]])]),
        stroke([M([42, 169]), C([111, 172], [210, 145], [281, 119])]),
        stroke([M([59, 207]), C([113, 226], [201, 202], [250, 179])]),
        // Off-centre mast: tapered solid, ending cleanly at the gunwale.
        polygon([[173, 157], [163, 36], [167, 35], [180, 155]]),
        polygon([[169, 38], [190, 32], [184, 43], [196, 48], [170, 50]], 'accent'),
        // Furled sail: broad cloth band with a transparent longitudinal slot.
        fill([M([111, 137]), C([130, 128], [187, 107], [218, 97]), L([223, 103]), C([196, 118], [142, 139], [115, 146]), Z(),
          M([132, 134]), L([198, 111]), L([188, 118]), L([138, 137]), Z()]),
        line([[109, 150], [225, 108]]),
        // Group one: the three taut bow stays form open, progressively narrower wedges.
        line([[168, 56], [270, 126]]), line([[169, 71], [252, 132]]), line([[171, 87], [235, 138]]),
        // Group two: paired long stern stays, spare against the solid low hull.
        line([[161, 47], [52, 174]]), line([[162, 65], [77, 174]]),
        // Group three: ladder-like short shrouds, deliberately separate from the stern stays.
        line([[163, 89], [127, 163]]), line([[165, 105], [148, 160]]),
        line([[155, 112], [164, 116]]), line([[151, 121], [161, 125]]),
        line([[147, 130], [158, 134]]), line([[142, 140], [155, 144]]),
        line([[138, 149], [152, 153]]),
        // Small cabin below the open rigging, with a real window aperture.
        fill([...contour([[84, 146], [108, 141], [124, 151], [123, 164], [85, 173]]), ...contour([[91, 151], [106, 148], [107, 157], [91, 161]])]),
        line([[81, 142], [107, 136], [123, 145]]),
        line([[112, 152], [117, 154], [117, 161]]),
        polygon([[94, 134], [94, 126], [100, 124], [101, 132]]),
        line([[91, 122], [102, 119]]),
        // Sail ties stay orthogonal to its diagonal band.
        line([[121, 133], [127, 142]]), line([[143, 125], [149, 134]]),
        line([[187, 109], [194, 119]]), line([[208, 101], [215, 111]]),
        line([[221, 100], [229, 95]]), line([[227, 95], [230, 101]]),
        // Belaying posts / cleats anchor the line vocabulary to the deck.
        line([[55, 170], [54, 163]]), line([[48, 164], [61, 162]]),
        line([[247, 134], [245, 127]]), line([[239, 129], [251, 125]]),
        line([[185, 154], [184, 145]]), line([[180, 148], [190, 145]]),
        // Interrupted water contours support the diagonal, with generous transparent gaps.
        stroke([M([28, 217]), C([42, 220], [56, 221], [70, 220])]),
        stroke([M([110, 222]), C([144, 218], [174, 211], [193, 205])]),
        stroke([M([223, 201]), C([252, 190], [270, 178], [283, 165])]),
        stroke([M([266, 189]), C([278, 183], [288, 175], [296, 165])]),
        line([[41, 155], [57, 151]]), line([[30, 161], [40, 159]]),
      ]
      return { marks }
    },
  },
]
