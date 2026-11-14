import { moveTo as M, lineTo as L, cubicTo as C, closePath as Z, type PathCommand, type PathMark, type Study, type Geometry } from './definition'

// Every contour is authored in the shared 320 × 240 canvas, not a mirrored stamp.
const fill = (commands: PathCommand[], role: 'ink' | 'accent' = 'ink'): PathMark => ({ kind: 'path', paint: 'fill', role, commands })
const etch = (...commands: PathCommand[]): PathMark => ({ kind: 'path', paint: 'stroke', stroke: 'fine', role: 'ink', commands })

function branch(): Geometry {
  return { marks: [
    // Tapered main stem and the seven separately composed leaf silhouettes.
    fill([M([69,211]), C([116,162],[178,102],[248,38]), C([200,87],[122,170],[73,214]), Z()]),
    etch(M([109,169]), C([100,153],[87,149],[77,145]), M([136,143]), C([148,154],[166,159],[183,159]), M([158,121]), C([145,112],[131,104],[121,95]), M([182,98]), C([199,112],[218,112],[231,111]), M([207,73]), C([193,65],[189,57],[185,48])),
    // Lower windward leaf: broad, split by an actual transparent vein-shaped hole.
    fill([M([100,163]), C([73,165],[49,144],[39,119]), C([68,123],[94,131],[100,163]), Z(), M([89,151]), C([75,143],[60,132],[49,127]), C([60,141],[76,149],[89,151]), Z()]),
    // Long leeward leaf, open mass.
    etch(M([154,153]), C([179,136],[210,143],[229,157]), C([206,171],[178,174],[154,153]), Z(), M([157,154]), C([180,151],[202,155],[223,157]), M([175,153]), C([181,150],[187,148],[192,148]), M([190,155]), C([199,160],[207,162],[215,160])),
    // Large blade rising into the upper left negative space.
    etch(M([142,110]), C([113,111],[94,85],[93,58]), C([119,70],[137,82],[142,110]), Z(), M([137,104]), C([119,92],[108,77],[98,65]), M([120,89]), C([120,82],[116,77],[113,74]), M([129,98]), C([119,98],[111,92],[106,86])),
    // A narrow filled blade pointing right with an inset channel.
    fill([M([197,108]), C([219,87],[249,91],[274,97]), C([250,113],[221,122],[197,108]), Z(), M([210,106]), C([227,101],[245,99],[260,98]), C([246,105],[227,108],[210,106]), Z()]),
    // Upright short blade, kinked shoulder unlike the other leaves.
    fill([M([195,65]), C([177,64],[169,49],[174,28]), L([185,37]), C([198,42],[201,54],[195,65]), Z(), M([190,56]), C([186,51],[180,43],[178,36]), C([178,47],[183,55],[190,56]), Z()]),
    // Upper blade slants outwards, outlined with sparse curved engraving.
    etch(M([222,64]), C([235,47],[257,44],[283,48]), C([268,65],[244,74],[222,64]), Z(), M([226,63]), C([244,57],[260,53],[277,50]), M([244,58]), C([246,54],[250,51],[254,50]), M([250,56]), C([256,60],[263,59],[268,57])),
    // Terminal curled leaf.
    etch(M([240,47]), C([225,39],[225,30],[235,26]), C([252,27],[258,36],[249,42]), C([245,43],[242,44],[240,47]), Z(), M([241,42]), C([240,36],[236,33],[232,31])),
    // Seed stems cross the lower third; irregular red pods are not circle stamps.
    etch(M([117,158]), C([120,174],[119,185],[114,194]), M([123,169]), C([136,174],[141,178],[144,185]), M([120,178]), C([129,187],[130,192],[129,200])),
    fill([M([111,184]), C([102,187],[103,199],[111,201]), C([120,198],[120,188],[111,184]), Z()], 'accent'),
    fill([M([143,179]), C([135,180],[136,190],[143,193]), C([152,193],[153,184],[143,179]), Z()], 'accent'),
    fill([M([128,194]), C([121,196],[122,207],[128,210]), C([136,209],[139,199],[128,194]), Z()], 'accent'),
  ] }
}

function moth(): Geometry {
  return { marks: [
    // Four separately drawn wing fields. Small asymmetries are intentional.
    etch(M([151,112]), C([126,74],[82,57],[38,43]), L([53,94]), C([75,109],[112,121],[151,127]), Z()),
    etch(M([168,111]), C([197,75],[238,57],[281,39]), L([266,94]), C([238,111],[201,121],[168,128]), Z()),
    etch(M([149,131]), C([121,123],[88,126],[67,141]), C([74,150],[72,159],[84,163]), C([85,176],[99,174],[105,185]), C([115,184],[120,198],[132,190]), C([144,179],[151,152],[149,131]), Z()),
    etch(M([171,132]), C([197,120],[229,126],[252,139]), C([245,151],[249,159],[235,164]), C([231,177],[218,174],[213,186]), C([199,183],[198,197],[186,189]), C([175,173],[169,149],[171,132]), Z()),
    // Ink tip wedges with closed, unpainted channels cut through their mass.
    fill([M([38,43]), C([61,52],[87,61],[102,72]), C([82,77],[66,86],[53,94]), Z(), M([48,53]), C([64,61],[79,66],[89,70]), C([78,68],[61,64],[48,59]), Z(), M([52,69]), C([64,72],[70,74],[77,76]), L([68,81]), L([54,76]), Z()]),
    fill([M([281,39]), L([266,94]), C([252,83],[238,75],[218,72]), C([239,60],[260,49],[281,39]), Z(), M([270,50]), C([255,58],[243,63],[232,69]), C([248,64],[260,60],[269,56]), Z(), M([266,68]), C([256,71],[249,73],[242,76]), L([251,81]), L([264,75]), Z()]),
    // Curved upper wing ribs, carefully spaced at the heavy stroke setting.
    etch(M([149,118]), C([120,102],[96,91],[70,86]), M([143,106]), C([125,90],[113,81],[103,77]), M([143,124]), C([117,118],[92,109],[66,99]), M([171,118]), C([199,102],[224,89],[250,86]), M([176,106]), C([193,91],[205,82],[216,77]), M([177,125]), C([204,118],[230,109],[255,99])),
    // Floating open lozenges echo the engraved edges without coating the wing.
    etch(M([103,86]), C([112,85],[127,94],[132,101]), C([120,100],[109,95],[103,86]), Z(), M([216,86]), C([206,85],[193,94],[187,102]), C([200,99],[210,95],[216,86]), Z()),
    // Lower wing fringe and long fan veins.
    etch(M([143,139]), C([127,145],[111,155],[94,163]), M([139,147]), C([130,159],[121,172],[117,181]), M([135,138]), C([113,136],[91,139],[79,145]), M([177,140]), C([194,144],[211,155],[227,165]), M([180,149]), C([187,163],[196,174],[201,183]), M([184,137]), C([206,134],[226,138],[239,144])),
    fill([M([86,147]), C([94,140],[106,141],[114,145]), C([108,150],[98,155],[91,157]), Z()], 'accent'),
    fill([M([205,144]), C([217,140],[227,143],[234,147]), L([227,157]), C([219,155],[211,149],[205,144]), Z()], 'accent'),
    // Small ink scallop echoes at the tips of the two lower wings.
    fill([M([127,179]), C([134,165],[139,158],[143,155]), C([140,174],[135,184],[131,187]), Z()]),
    fill([M([178,156]), C([184,164],[187,171],[191,180]), L([187,185]), C([181,177],[179,166],[178,156]), Z()]),
    // Slender articulated body, with transparent segment breaks.
    fill([M([155,93]), C([155,85],[164,84],[166,93]), C([169,99],[168,105],[164,110]), L([155,110]), C([151,104],[152,98],[155,93]), Z()]),
    fill([M([154,115]), L([165,115]), C([168,123],[167,132],[165,139]), L([154,139]), C([151,130],[151,121],[154,115]), Z()]),
    fill([M([154,144]), L([165,144]), L([164,153]), L([155,153]), Z()]),
    fill([M([155,158]), L([164,158]), L([163,166]), L([156,166]), Z()]),
    fill([M([157,171]), L([163,171]), C([163,179],[161,183],[160,187]), C([157,182],[156,177],[157,171]), Z()]),
    etch(M([157,89]), C([153,71],[144,57],[132,51]), M([163,88]), C([167,70],[176,56],[188,48]), M([149,69]), L([140,68]), M([146,62]), L([137,60]), M([172,68]), L([181,65]), M([176,60]), L([185,56])),
  ] }
}

export const ARTISTIC_NATURE: readonly Study[] = [
  { id: 'wind-cut-branch', title: 'Wind-cut branch', category: 'Illustration', provenance: 'illustrative',
    description: 'An asymmetric diagonal sprig with seven individually shaped leaves and a red seed cluster.',
    basis: 'Original authored botanical-inspired composition in a 320 × 240 canvas. Absolute cubic Bézier contours, tapered filled stems, open engraved blades and even-odd transparent leaf channels. A fixed illustration, not a species identification or botanical model.',
    tags: ['bespoke-vector', 'engraved-natural', 'botanical', 'branch'], aliases: ['Wind cut sprig', 'Engraved botanical branch'], parameters: [], model: branch },
  { id: 'night-wing-specimen', title: 'Night-wing specimen', category: 'Illustration', provenance: 'illustrative',
    description: 'An imagined moth with angular upper wings, scalloped lower wings and small red patches.',
    basis: 'Original authored imagined moth composition in a 320 × 240 canvas. Four individually drawn cubic Bézier wing fields, asymmetric tip wedges with even-odd transparent channels and a segmented body. Decorative engraving, not a species portrait or biological reconstruction.',
    tags: ['bespoke-vector', 'engraved-natural', 'moth', 'wings'], aliases: ['Imagined moth', 'Engraved night moth'], parameters: [], model: moth },
]
