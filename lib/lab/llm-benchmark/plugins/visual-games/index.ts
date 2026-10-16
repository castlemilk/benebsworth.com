import type { BenchmarkPlugin } from '../registry'
import { lighthouseRotation, lighthouseOrbit, lighthouseReset, racerAcceleration, racerSteering, racerBraking, racerRestart } from './checks'
import { LighthouseDemo, CarRacerDemo } from './demo'

export const visualGames: BenchmarkPlugin = {
  id: 'visual-games',
  name: 'Visual Games',
  version: '1.0.0',
  description: 'A rotating voxel lighthouse and a playable car racer, checked through browser interaction.',
  capabilities: ['tasks', 'checks', 'demos'],
  tasks: [
    {
      id: 'voxel-lighthouse', slug: 'voxel-lighthouse', category: '3d-physics-animation',
      title: 'Voxel Lighthouse',
      blurb: 'A richly detailed Minecraft / Roblox style lighthouse, rotating in true 3D with an orbit camera.',
      prompt: `Create a single-file HTML page drawing a richly detailed 3D lighthouse in a blocky Minecraft / Roblox inspired voxel style. Use actual 3D geometry and perspective (WebGL or your own projected 3D renderer), not a flat illustration spun in CSS. Automatically rotate the camera around the island so every side becomes visible. Add as many coherent details as possible: striped masonry tower, lantern room and revolving light beam, balcony and railings, door and windows, keeper's cottage, stairs, rocky island, dock, small boat, waves, foam, trees, grass, flowers, crates, birds and clouds. Use directional lighting, depth sorting or depth testing, and distinct materials. The lighthouse must be the clear focal point.
Support pointer dragging to orbit horizontally and vertically, wheel zoom, pause/resume, and reset view. Make the scene fit both desktop and mobile. Do not load external libraries or assets; a compact hand-written 3D renderer is acceptable.
Interaction contract for reproducible testing: render the scene in canvas#scene. Provide button#toggle-rotation with aria-pressed="true" while auto-rotation is running and "false" while paused. Start running. Pausing must freeze ALL animation (water, birds and beam included), while manual orbit still works. Provide button#reset-view: reset camera orientation and zoom to the same initial view and pause all animation. These controls must be visible and outside the canvas.`,
      runtimeHint: 'Browser, offline Canvas or WebGL, pointer orbit and wheel zoom',
      iterationsDefault: 5,
      methodNotes: '30% structural HTML and 70% browser checks: automatic motion/pause (35), manual orbit from a frozen scene (35), deterministic camera reset (30). Detail richness, voxel style, genuine 3D geometry and artistic quality require artifact inspection; the score does not grade them.',
      demoComponentName: 'LighthouseDemo', scorer: 'behavioral',
      checks: ['lighthouse-rotation', 'lighthouse-orbit', 'lighthouse-reset'],
    },
    {
      id: 'car-racer', slug: 'car-racer', category: 'advanced-game-building',
      title: 'Car Racer',
      blurb: 'A playable circuit racer with acceleration, braking, steering, lap tracking, and restart.',
      prompt: `Build a complete playable car racing game in one self-contained HTML file. Use a top-down or pseudo-3D view with a detailed closed circuit, a clearly visible player car, trackside scenery, curbs, start/finish line and rival cars. Include acceleration, braking, steering, off-road slowdown, collisions, ordered checkpoints and lap timing so driving across the finish line backwards cannot award laps. Show speed, lap progress and race status. Start the player stationary on the track and ready to drive immediately, with no modal or countdown. ArrowUp/W accelerates, ArrowDown/S brakes, ArrowLeft/A and ArrowRight/D steer. Include mobile touch controls and a Restart button. Aim for smooth, responsive play and a polished arcade presentation. Use inline Canvas and plain JavaScript; no external assets or libraries.
Interaction contract for reproducible testing: render the race in canvas#scene and provide button#restart. On the canvas, maintain numeric data-speed (nonnegative speed), data-heading (unwrapped vehicle heading in radians), and data-distance (cumulative forward distance travelled since restart). These values must come from the SAME vehicle state used to draw and simulate the car, and update each frame. Restart resets speed and distance to zero, the car to its initial position and heading, and the lap/timer state.`,
      runtimeHint: 'Browser, Canvas, keyboard and touch controls',
      iterationsDefault: 5,
      methodNotes: '30% structural HTML and 70% browser checks: acceleration plus visible motion (35), steering plus visible motion (25), braking (20), restart (20). Checks read the rendered canvas and explicitly requested vehicle telemetry; rival AI, collision realism and lap integrity are not automatically scored.',
      demoComponentName: 'CarRacerDemo', scorer: 'behavioral',
      checks: ['racer-acceleration', 'racer-steering', 'racer-braking', 'racer-restart'],
    },
  ],
  checks: {
    'lighthouse-rotation': lighthouseRotation,
    'lighthouse-orbit': lighthouseOrbit,
    'lighthouse-reset': lighthouseReset,
    'racer-acceleration': racerAcceleration,
    'racer-steering': racerSteering,
    'racer-braking': racerBraking,
    'racer-restart': racerRestart,
  },
  demos: { LighthouseDemo, CarRacerDemo },
}
