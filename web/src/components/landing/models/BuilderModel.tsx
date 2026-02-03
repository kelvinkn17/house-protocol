import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const GOLD = 0xcbad6d
const DARK_GOLD = 0x8a7440

export default function BuilderModel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const w = 140
    const h = 140

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0.8, 5.5)

    // lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.3))
    const key = new THREE.DirectionalLight(0xffffff, 0.8)
    key.position.set(3, 4, 5)
    scene.add(key)
    const rim = new THREE.DirectionalLight(GOLD, 0.4)
    rim.position.set(-3, -2, 3)
    scene.add(rim)
    const point = new THREE.PointLight(GOLD, 0.5, 10)
    point.position.set(0, 2, 3)
    scene.add(point)

    const group = new THREE.Group()
    scene.add(group)

    // block positions
    const positions = [
      { x: 0, y: -0.7, z: 0, s: 0.45 },
      { x: 0.55, y: -0.7, z: 0, s: 0.35 },
      { x: -0.55, y: -0.7, z: 0, s: 0.35 },
      { x: 0.15, y: -0.1, z: 0.1, s: 0.38 },
      { x: -0.3, y: -0.1, z: -0.1, s: 0.32 },
      { x: 0, y: 0.5, z: 0, s: 0.3 },
      { x: 0.7, y: 0.4, z: 0.3, s: 0.18 },
      { x: -0.65, y: 0.6, z: -0.2, s: 0.15 },
    ]

    const blocks: { mesh: THREE.Mesh; orig: (typeof positions)[0]; phase: number }[] = []

    positions.forEach((p, i) => {
      const geo = new THREE.BoxGeometry(p.s, p.s, p.s)
      const isAccent = i >= 6

      const mat = isAccent
        ? new THREE.MeshPhongMaterial({
            color: GOLD,
            emissive: DARK_GOLD,
            emissiveIntensity: 0.3,
            shininess: 150,
            specular: new THREE.Color(0xffffff),
          })
        : new THREE.MeshPhongMaterial({
            color: 0x1a1a1a,
            emissive: DARK_GOLD,
            emissiveIntensity: i < 3 ? 0.05 : 0.12,
            flatShading: true,
            shininess: 60,
            specular: new THREE.Color(GOLD),
          })

      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(p.x, p.y, p.z)

      const edges = new THREE.EdgesGeometry(geo)
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({
          color: GOLD,
          transparent: true,
          opacity: isAccent ? 0.5 : 0.12,
        })
      )
      mesh.add(line)

      group.add(mesh)
      blocks.push({ mesh, orig: { ...p }, phase: Math.random() * Math.PI * 2 })
    })

    // connection lines
    const connections = [
      [0, 3],
      [0, 4],
      [3, 5],
      [4, 5],
      [1, 3],
      [2, 4],
    ]
    const linePoints: THREE.Vector3[] = []
    connections.forEach(([a, b]) => {
      linePoints.push(
        new THREE.Vector3(positions[a].x, positions[a].y, positions[a].z),
        new THREE.Vector3(positions[b].x, positions[b].y, positions[b].z)
      )
    })
    const lineGeo = new THREE.BufferGeometry().setFromPoints(linePoints)
    const lineMat = new THREE.LineBasicMaterial({ color: GOLD, transparent: true, opacity: 0.08 })
    const connectionLines = new THREE.LineSegments(lineGeo, lineMat)
    group.add(connectionLines)

    let animationId: number
    const animate = (t: number) => {
      const time = t * 0.001
      group.rotation.y = time * 0.25

      blocks.forEach((b, i) => {
        const float = Math.sin(time * 0.8 + b.phase) * 0.06
        b.mesh.position.y = b.orig.y + float
        if (i >= 6) {
          b.mesh.rotation.x = time * 0.4 + b.phase
          b.mesh.rotation.z = time * 0.3
        } else {
          b.mesh.rotation.y = Math.sin(time * 0.3 + b.phase) * 0.05
        }
      })

      // update connection lines
      const pos = connectionLines.geometry.attributes.position.array as Float32Array
      connections.forEach(([a, b], idx) => {
        const ba = blocks[a]
        const bb = blocks[b]
        pos[idx * 6] = ba.mesh.position.x
        pos[idx * 6 + 1] = ba.mesh.position.y
        pos[idx * 6 + 2] = ba.mesh.position.z
        pos[idx * 6 + 3] = bb.mesh.position.x
        pos[idx * 6 + 4] = bb.mesh.position.y
        pos[idx * 6 + 5] = bb.mesh.position.z
      })
      connectionLines.geometry.attributes.position.needsUpdate = true

      renderer.render(scene, camera)
      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animationId)
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={containerRef} className="w-[140px] h-[140px]" />
}
