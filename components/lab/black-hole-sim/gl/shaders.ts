// GLSL ES 3.00 (WebGL2) for the black-hole ray tracer. One fullscreen
// triangle; the fragment shader integrates the exact Schwarzschild null
// geodesic per pixel (Binet form, RK4) and shades a Shakura–Sunyaev thin
// accretion disk with the exact circular-orbit relativistic g-factor.
//
// Geometric units: G = c = 1, M = 1 → rs = 2 sim units, photon sphere = 3,
// ISCO = 6. The disk lies in the y = 0 plane.

export const BH_VERT = `#version 300 es
void main() {
  // Attribute-less fullscreen triangle from gl_VertexID: (-1,-1) (3,-1) (-1,3)
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`

export const BH_FRAG = `#version 300 es
precision highp float;

out vec4 fragColor;

uniform vec2 uResolution;   // drawing-buffer pixels
uniform float uTime;        // seconds (advects the disk texture)
uniform vec3 uCamPos;       // sim units
uniform vec3 uCamRight;
uniform vec3 uCamUp;
uniform vec3 uCamFwd;
uniform float uFovTan;      // tan(fov/2), vertical
uniform float uInnerR;      // disk inner radius, sim units (ISCO = 6)
uniform float uOuterR;      // disk outer radius, sim units
uniform float uTpeak;       // physical SS73 peak temperature, K
uniform float uTclr;        // chromatic compression: min(1, 9500/Tpeak)
uniform float uBeaming;     // 0..1 — mixes the g-factor in (0 = film-style off)
uniform float uExposure;
uniform int uSteps;         // 180 / 200 / 320 by quality

const float R_CAPTURE = 2.02;   // just outside the horizon (rs = 2)
const float R_ESCAPE = 60.0;
// Max of the SS73 profile x^0.75 (1-√x)^0.25 at r = (49/36)·r_in:
// (36/49)^0.75 · (1/7)^0.25 = 0.48787 — normalises Trel to [0,1].
const float TREL_NORM = 0.48787;

// ── hash / value-noise / fbm ────────────────────────────────────────────
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.17; a *= 0.5; }
  return v;
}

// ── blackbody colour: Planckian-locus fit (Tanner Helland / Neil Bartlett
// polynomial), valid 1000–40000 K, clamped outside ──────────────────────
vec3 kelvinToRGB(float kelvin) {
  float t = clamp(kelvin, 1000.0, 40000.0) / 100.0;
  float r, g, b;
  if (t <= 66.0) {
    r = 1.0;
    g = clamp(0.3900816 * log(t) - 0.6318414, 0.0, 1.0);
  } else {
    r = clamp(1.2929362 * pow(max(t - 60.0, 0.001), -0.1332047), 0.0, 1.0);
    g = clamp(1.1298909 * pow(max(t - 60.0, 0.001), -0.0755148), 0.0, 1.0);
  }
  if (t >= 66.0) {
    b = 1.0;
  } else if (t <= 19.0) {
    b = 0.0;
  } else {
    b = clamp(0.5432068 * log(t - 10.0) - 1.1962540, 0.0, 1.0);
  }
  return vec3(r, g, b);
}

// ── ACES tonemap (Narkowicz) ────────────────────────────────────────────
vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

// ── procedural starfield background ─────────────────────────────────────
// Cube-face projection of the escaped direction → a stable 2-D cell space
// for star hashing (no polar pinching). Lensing (Einstein-ring smearing)
// comes free from the geodesics bending the sampled direction.
vec3 cubeUV(vec3 d) {
  vec3 a = abs(d);
  if (a.x >= a.y && a.x >= a.z) return vec3(d.yz / a.x, d.x > 0.0 ? 0.0 : 1.0);
  if (a.y >= a.z) return vec3(d.xz / a.y, d.y > 0.0 ? 2.0 : 3.0);
  return vec3(d.xy / a.z, d.z > 0.0 ? 4.0 : 5.0);
}

vec3 starLayer(vec2 uv, float seed, float cells, float density, float bright) {
  vec2 g = uv * cells;
  vec2 cell = floor(g);
  vec2 f = g - cell;
  float h = hash12(cell + seed);
  if (h > density) return vec3(0.0);
  vec2 sp = 0.15 + 0.7 * vec2(hash12(cell + seed + 13.7), hash12(cell + seed + 57.1));
  float d = length(f - sp);
  float amp = bright * (0.35 + 0.65 * hash12(cell + seed + 3.1));
  float i = amp * pow(smoothstep(0.18, 0.0, d), 3.0);
  // slight colour-temperature variation, warm-biased like a real field
  float temp = mix(2800.0, 11000.0, pow(hash12(cell + seed + 7.7), 2.0));
  return i * kelvinToRGB(temp);
}

vec3 background(vec3 d) {
  vec3 cu = cubeUV(d);
  float seed = cu.z * 97.13;
  vec3 col = vec3(0.0);
  col += starLayer(cu.xy, seed, 90.0, 0.18, 0.38);         // dense faint layer
  col += starLayer(cu.xy, seed + 41.0, 34.0, 0.06, 1.5);   // sparse bright layer
  // faint tilted galactic band: smoothstep on angle to a tilted plane,
  // warm dust tint, low-amplitude fbm patchiness
  vec3 bandN = normalize(vec3(0.36, 0.88, 0.30));
  float bd = abs(dot(d, bandN));
  float band = pow(smoothstep(0.55, 0.0, bd), 2.0);
  float dust = fbm(cu.xy * 3.0 + cu.z * 11.0);
  col += band * (0.035 + 0.08 * dust) * vec3(1.0, 0.83, 0.62);
  return col;
}

// ── null-geodesic acceleration (Binet form, exact Schwarzschild) ────────
// d²x/dλ² = -(3/2)·rs·h² x / |x|⁵ with h = |x×v| conserved along the ray.
// These units have rs = 2 (M = 1), so the coefficient is 3. (The familiar
// -1.5 h² x/r⁵ from starless assumes rs = 1; using it here halves the
// bending and shrinks the shadow to b ≈ 2.6 instead of √27 ≈ 5.196.)
vec3 accel(vec3 x, float h2) {
  float r2 = dot(x, x);
  return -3.0 * h2 * x / pow(r2, 2.5);
}

// ── thin-disk emission at the crossing point ────────────────────────────
// hit: interpolated equatorial crossing; marchDir: photon marching direction
// there (so -marchDir is the direction the photon left the disk toward us).
vec3 shadeDisk(vec3 hit, vec3 marchDir) {
  float r = length(hit.xz);

  // Shakura–Sunyaev relative temperature, normalised so Trel ∈ [0,1]
  // (peaks at r = 49/36 · r_in): Trel = (rIn/r)^¾ (1 - √(rIn/r))^¼ / 0.48787
  float xr = uInnerR / r;
  float trel = pow(xr, 0.75) * pow(max(0.0, 1.0 - sqrt(xr)), 0.25) / TREL_NORM;
  trel = clamp(trel, 0.0, 1.0);

  // circular-geodesic orbital speed seen by a static observer (M = 1):
  // β = √(1/(r-2)) — sanity: β = 0.5 at the ISCO r = 6
  float beta = sqrt(1.0 / max(r - 2.0, 0.5));
  // orbital direction: ê_φ = normalize(ŷ × x) → the LEFT side approaches
  vec3 ephi = normalize(cross(vec3(0.0, 1.0, 0.0), hit));
  vec3 dHat = -marchDir; // direction the photon left the disk toward the camera
  // exact relativistic g-factor for a circular equatorial orbit —
  // √(1-3/r) already contains gravitational redshift AND orbital time
  // dilation (no extra √(1-2/r) factor)
  float g = sqrt(max(1.0 - 3.0 / r, 0.0)) / max(1.0 - beta * dot(ephi, dHat), 1e-3);
  float gEff = mix(1.0, g, uBeaming);

  // procedural texture: differentially-rotating turbulence × radial banding.
  // Material azimuth ψ = φ + Ω(r)·t with Kepler Ω = r^(-3/2); sampling fbm on
  // the rotated unit circle × r keeps it seam-free while advecting.
  float phi = atan(hit.z, hit.x);
  float omega = pow(r, -1.5);
  float phiAdv = phi + uTime * 1.5 * omega;
  vec2 q = vec2(cos(phiAdv), sin(phiAdv)) * r;
  float turb = fbm(q * 1.4);
  float bands = 0.68 + 0.32 * sin(r * 3.1 + 4.0 * fbm(vec2(r * 2.2, 7.3)));
  float tex = bands * (0.45 + 0.8 * turb);

  // observed temperature (Doppler/gravitationally shifted) → Planckian
  // colour, chromatically compressed onto the visible locus by uTclr;
  // bolometric intensity ∝ Trel⁴ (Stefan–Boltzmann) × g⁴
  float tObs = gEff * uTpeak * trel;
  vec3 c = kelvinToRGB(tObs * uTclr);
  float lum = pow(trel, 4.0) * pow(gEff, 4.0);
  // warm cinematic grade: golden mids, amber falloff at the cool outer edge
  return c * vec3(1.18, 0.95, 0.72) * lum * tex * 2.6;
}

void main() {
  vec2 uv = (2.0 * gl_FragCoord.xy - uResolution) / uResolution.y;
  vec3 dir = normalize(uCamFwd + uFovTan * (uv.x * uCamRight + uv.y * uCamUp));

  // photon state: position x, direction v; angular momentum h conserved,
  // computed ONCE at the ray start
  vec3 x = uCamPos;
  vec3 v = dir;
  vec3 hv = cross(x, v);
  float h2 = dot(hv, hv);

  vec3 col = vec3(0.0);
  float trans = 1.0; // remaining transmittance (disk rim fades are partial)
  float glow = 0.0;  // accumulated photon-sphere / disk halo luminance

  for (int i = 0; i < 400; i++) {
    if (i >= uSteps) break;

    float r = length(x);
    if (r < R_CAPTURE) { trans = 0.0; break; } // captured: the shadow
    if (r > R_ESCAPE && dot(x, v) > 0.0) {     // escaped: shade the sky
      col += trans * background(normalize(v));
      trans = 0.0;
      break;
    }

    // adaptive affine step — shrinks near the hole; far from it the
    // geodesic is nearly straight, so the cap relaxes (otherwise sky rays
    // starve the step budget before reaching R_ESCAPE and render black)
    float dt = clamp(0.06 * r, 0.015, 0.45);
    dt *= 1.0 + 4.0 * smoothstep(14.0, 45.0, r);

    // RK4 on x' = v, v' = a(x)
    vec3 x0 = x, v0 = v;
    vec3 k1x = v0;                    vec3 k1v = accel(x0, h2);
    vec3 k2x = v0 + 0.5 * dt * k1v;   vec3 k2v = accel(x0 + 0.5 * dt * k1x, h2);
    vec3 k3x = v0 + 0.5 * dt * k2v;   vec3 k3v = accel(x0 + 0.5 * dt * k2x, h2);
    vec3 k4x = v0 + dt * k3v;         vec3 k4v = accel(x0 + dt * k3x, h2);
    x = x0 + (dt / 6.0) * (k1x + 2.0 * k2x + 2.0 * k3x + k4x);
    v = v0 + (dt / 6.0) * (k1v + 2.0 * k2v + 2.0 * k3v + k4v);

    // cheap bloom stand-in: luminance accumulated near the photon sphere
    // and just above/below the disk
    float rNow = length(x);
    glow += trans * dt * 0.012 * exp(-2.6 * abs(rNow - 3.0));
    float rCyl = length(x.xz);
    if (rCyl > uInnerR && rCyl < uOuterR) {
      glow += trans * dt * 0.006 * exp(-1.8 * abs(x.y)) * uInnerR / rCyl;
    }

    // thin equatorial disk: detect the y = 0 sign change, lerp the crossing
    if (x0.y * x.y < 0.0) {
      float t = x0.y / (x0.y - x.y);
      vec3 hit = mix(x0, x, t);
      float rh = length(hit.xz);
      if (rh > uInnerR && rh < uOuterR) {
        // soft radial fade (~0.4 sim units) at both rims → treated as
        // coverage so the edge anti-aliases against the background
        float cov = smoothstep(uInnerR, uInnerR + 0.4, rh)
                  * (1.0 - smoothstep(uOuterR - 0.4, uOuterR, rh));
        vec3 vHit = normalize(mix(v0, v, t));
        col += trans * cov * shadeDisk(hit, vHit);
        trans *= 1.0 - cov;       // the first (substantive) hit is opaque
        if (trans < 0.02) break;
      }
    }
  }
  // rays that exhaust the budget are photon-sphere grazers → leave black

  col += glow * vec3(1.0, 0.85, 0.6);

  // ── post: exposure → ACES → vignette → gamma → dither ────────────────
  col *= uExposure;
  col = aces(col);
  float vig = 1.0 - 0.32 * smoothstep(0.5, 1.4, length(uv));
  col *= vig;
  col = pow(col, vec3(1.0 / 2.2));
  col += (hash12(gl_FragCoord.xy) - 0.5) * (1.5 / 255.0);

  fragColor = vec4(col, 1.0);
}
`
