'use client'

import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { SpatialFrame } from '@/lib/lab/spatial/types'
import { SpatialFallback, type CameraView } from './fallback'

type SceneApi = { update: (frame: SpatialFrame) => void; view: (view: CameraView) => void }
type Renderable = THREE.Line<THREE.BufferGeometry, THREE.LineBasicMaterial> | THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>

/** Reuse buffers and materials: the model changes, WebGL allocations do not. */
export function SpatialScene({ frame, title, view, cameraDistance = 9, cameraReset, onFallback }: { frame: SpatialFrame; title: string; view: CameraView; cameraDistance?: number; cameraReset: number; onFallback: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const api = useRef<SceneApi | null>(null)
  const latest = useRef(frame)
  latest.current = frame
  const [fallback, setFallback] = useState(false)
  useEffect(() => {
    if (fallback || !canvas.current || !root.current) return
    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas.current, antialias: true, alpha: true, preserveDrawingBuffer: true })
    } catch {
      setFallback(true)
      onFallback()
      return
    }
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75))
    renderer.setClearColor('#080d18', 0)
    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100)
    camera.position.set(6.8, 4.6, 8.5).setLength(cameraDistance)
    const controls = new OrbitControls(camera, canvas.current)
    controls.enableDamping = false
    controls.enablePan = false
    controls.minDistance = 5
    controls.maxDistance = 18
    // Leave vertical touch gestures for article scrolling.
    controls.touches.ONE = THREE.TOUCH.ROTATE
    canvas.current.style.touchAction = 'pan-y'
    const lines: Renderable[] = [], surfaces: Renderable[] = [], dots: Renderable[] = []
    const dispose = (object: Renderable) => { scene.remove(object); object.geometry.dispose(); object.material.dispose() }
    const trim = (objects: Renderable[], count: number) => { while (objects.length > count) dispose(objects.pop()!) }
    const draw = () => renderer.render(scene, camera)
    const buffer = (object: Renderable, values: number[]) => {
      const attribute = object.geometry.getAttribute('position') as THREE.BufferAttribute | undefined
      if (!attribute || attribute.array.length !== values.length) object.geometry.setAttribute('position', new THREE.Float32BufferAttribute(values, 3))
      else { (attribute.array as Float32Array).set(values); attribute.needsUpdate = true }
      object.geometry.computeBoundingSphere()
    }
    const update = (next: SpatialFrame) => {
      trim(lines, next.lines.length)
      next.lines.forEach((line, i) => {
        if (!lines[i]) {
          const object = new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ transparent: true, depthWrite: false }))
          lines[i] = object; scene.add(object)
        }
        buffer(lines[i], line.points.flat())
        lines[i].material.color.set(line.color)
        lines[i].material.opacity = line.opacity ?? 0.9
      })
      trim(surfaces, next.surfaces?.length ?? 0)
      next.surfaces?.forEach((surface, i) => {
        if (!surfaces[i]) {
          const object = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide, depthWrite: false }))
          surfaces[i] = object; scene.add(object)
        }
        buffer(surfaces[i], surface.vertices.flat())
        const indices = surfaces[i].geometry.getIndex()
        if (!indices || indices.count !== surface.indices.length) surfaces[i].geometry.setIndex(surface.indices)
        else { indices.set(surface.indices); indices.needsUpdate = true }
        surfaces[i].material.color.set(surface.color)
        surfaces[i].material.opacity = surface.opacity ?? 0.16
      })
      trim(dots, next.points?.length ?? 0)
      next.points?.forEach((point, i) => {
        if (!dots[i]) {
          const object = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), new THREE.MeshBasicMaterial())
          dots[i] = object; scene.add(object)
        }
        dots[i].position.set(...point.position)
        dots[i].scale.setScalar(point.size ?? 0.055)
        dots[i].material.color.set(point.color)
      })
      draw()
    }
    const grid = new THREE.GridHelper(7, 14, '#233149', '#142135')
    grid.position.y = -2.35
    grid.material.transparent = true
    grid.material.opacity = 0.38
    scene.add(grid)
    api.current = { update, view: next => {
      camera.up.set(0, 1, 0)
      const distance = cameraDistance / Math.min(1, camera.aspect)
      if (next === 'front') camera.position.set(0, 0, distance)
      else if (next === 'top') { camera.position.set(0, distance, 0.001); camera.up.set(0, 0, -1) }
      else camera.position.set(6.8, 4.6, 8.5).setLength(distance)
      controls.target.set(0, 0, 0); controls.update(); draw()
    } }
    controls.addEventListener('change', draw)
    const resize = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      if (!width || !height) return
      renderer.setSize(width, height, false)
      const previousFit = Math.min(1, camera.aspect)
      camera.aspect = width / height
      // Preserve the user's zoom while fitting the same world width on phones.
      camera.position.multiplyScalar(previousFit / Math.min(1, camera.aspect))
      camera.updateProjectionMatrix(); controls.update(); draw()
    })
    resize.observe(root.current)
    update(latest.current)
    const target = canvas.current
    const lost = (event: Event) => { event.preventDefault(); setFallback(true); onFallback() }
    target.addEventListener('webglcontextlost', lost)
    return () => {
      api.current = null; resize.disconnect(); controls.dispose()
      target.removeEventListener('webglcontextlost', lost)
      ;[...lines, ...surfaces, ...dots].forEach(dispose)
      grid.geometry.dispose(); grid.material.dispose(); renderer.dispose(); renderer.forceContextLoss()
    }
  }, [fallback, onFallback, cameraDistance])
  useEffect(() => { api.current?.update(frame) }, [frame])
  useEffect(() => { api.current?.view(view) }, [view, cameraReset])
  return <div ref={root} className="absolute inset-0" data-scene-status={fallback ? 'fallback' : 'webgl'}>
    {fallback ? <SpatialFallback frame={frame} title={title} view={view} /> : <canvas ref={canvas} className="block h-full w-full" role="img" aria-label={`${title} interactive 3D model`} data-renderer="three" />}
    {fallback && <p className="absolute bottom-3 left-4 right-4 text-center text-xs text-slate-300">3D graphics unavailable. Projected view uses the same equations and controls.</p>}
  </div>
}
