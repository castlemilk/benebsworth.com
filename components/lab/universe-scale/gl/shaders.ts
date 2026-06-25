// GLSL (WebGL1 / GLSL 100) for the Universe-Scale 3D scene. ogl auto-injects
// the matrix uniforms (modelViewMatrix, projectionMatrix, normalMatrix).

export const LIT_VERT = /* glsl */ `
attribute vec3 position;
attribute vec3 normal;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform mat3 normalMatrix;
varying vec3 vNormal;   // view-space normal
varying vec3 vLocal;    // unit local position, for procedural surface
void main() {
  vNormal = normalize(normalMatrix * normal);
  vLocal = normalize(position);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

export const LIT_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uColor;     // base / ocean / dark band
uniform vec3 uColor2;    // accent / land / hot / rim
uniform float uOpacity;
uniform int uSurface;    // 0 plain, 1 earth, 2 sun(emissive), 3 moon, 4 gas, 5 mottle, 6 metal
uniform float uTime;
uniform vec3 uLightDir;  // view-space light direction
varying vec3 vNormal;
varying vec3 vLocal;

float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float noise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
  return mix(mix(mix(hash(i+vec3(0,0,0)),hash(i+vec3(1,0,0)),f.x),
                 mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                 mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p){ float v=0.0, a=0.5; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.02; a*=0.5; } return v; }

void main() {
  vec3 n = normalize(vNormal);
  float diff = max(dot(n, normalize(uLightDir)), 0.0);
  float rim = pow(1.0 - max(dot(n, vec3(0.0,0.0,1.0)), 0.0), 2.5);
  vec3 sp = vLocal;
  vec3 base = uColor;
  vec3 rimCol = uColor2;

  if (uSurface == 1) {            // earth
    float c = fbm(sp*2.3 + 3.0);
    float land = smoothstep(0.50, 0.58, c);
    base = mix(uColor, uColor2, land);
    base = mix(base, vec3(0.92,0.95,1.0), smoothstep(0.74,0.92,abs(sp.y)) * 0.9); // ice caps
    rimCol = vec3(0.35,0.6,1.0);  // atmosphere
  } else if (uSurface == 3) {     // moon / rock
    float c = fbm(sp*4.0);
    base = mix(uColor*0.8, uColor*1.12, c);
    base -= 0.18 * smoothstep(0.55,0.95, fbm(sp*9.0+10.0));
  } else if (uSurface == 4) {     // gas giant bands
    float b = fbm(vec3(sp.x*1.2, sp.y*9.0, sp.z*1.2) + vec3(uTime*0.04,0.0,0.0));
    base = mix(uColor, uColor2, smoothstep(0.38,0.62,b));
  } else if (uSurface == 5) {     // mottle (cells / rocky bodies)
    float c = fbm(sp*3.2);
    base = mix(uColor*0.85, uColor*1.18, c);
  }

  if (uSurface == 2) {            // sun: emissive turbulence
    float f = fbm(sp*3.2 + uTime*0.12);
    float g = fbm(sp*7.0 - uTime*0.08);
    vec3 col = mix(uColor, uColor2, f*0.7 + g*0.3) * 1.25;
    gl_FragColor = vec4(col, uOpacity);
    return;
  }

  float amb = 0.16;
  vec3 lit = base * (amb + diff * 0.95) + rimCol * rim * 0.4;
  gl_FragColor = vec4(lit, uOpacity);
}
`

export const POINTS_VERT = /* glsl */ `
attribute vec3 position;
attribute vec3 color;
attribute float size;
uniform mat4 modelViewMatrix;
uniform mat4 projectionMatrix;
uniform float uPointScale;
varying vec3 vColor;
void main() {
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = size * uPointScale / max(0.05, -mv.z);
}
`

export const POINTS_FRAG = /* glsl */ `
precision highp float;
uniform float uOpacity;
varying vec3 vColor;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = dot(c, c);
  if (d > 0.25) discard;
  float a = smoothstep(0.25, 0.0, d);
  gl_FragColor = vec4(vColor, a * uOpacity);
}
`
