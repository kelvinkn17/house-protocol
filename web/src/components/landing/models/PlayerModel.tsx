import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const GOLD = 0xcbad6d
const DARK_GOLD = 0x8a7440

export default function PlayerModel() {
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
    camera.position.set(0, 0.3, 5)

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

    // main icosahedron
    const mainGeo = new THREE.IcosahedronGeometry(1.0, 0)
    const mainMat = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,
      emissive: DARK_GOLD,
      emissiveIntensity: 0.2,
      flatShading: true,
      shininess: 80,
      specular: new THREE.Color(GOLD),
    })
    const main = new THREE.Mesh(mainGeo, mainMat)
    scene.add(main)

    // wireframe overlay
    const wireGeo = new THREE.IcosahedronGeometry(1.15, 0)
    const wireMat = new THREE.MeshBasicMaterial({
      color: GOLD,
      wireframe: true,
      transparent: true,
      opacity: 0.2,
    })
    const wire = new THREE.Mesh(wireGeo, wireMat)
    scene.add(wire)

    // orbiting rings
    const rings: THREE.Mesh[] = []
    for (let i = 0; i < 3; i++) {
      const ringGeo = new THREE.TorusGeometry(1.5 + i * 0.15, 0.008, 8, 64)
      const ringMat = new THREE.MeshBasicMaterial({
        color: GOLD,
        transparent: true,
        opacity: 0.15 - i * 0.03,
      })
      const ring = new THREE.Mesh(ringGeo, ringMat)
      ring.rotation.x = Math.PI / 2 + (i - 1) * 0.3
      ring.rotation.z = i * 0.5
      scene.add(ring)
      rings.push(ring)
    }

    // trail dots
    const trailGeo = new THREE.BufferGeometry()
    const tCount = 60
    const tPos = new Float32Array(tCount * 3)
    for (let i = 0; i < tCount; i++) {
      const angle = (i / tCount) * Math.PI * 2
      const r = 1.6
      tPos[i * 3] = Math.cos(angle) * r * (0.8 + Math.random() * 0.4)
      tPos[i * 3 + 1] = (Math.random() - 0.5) * 1.5
      tPos[i * 3 + 2] = Math.sin(angle) * r * (0.8 + Math.random() * 0.4)
    }
    trailGeo.setAttribute('position', new THREE.BufferAttribute(tPos, 3))
    const trailMat = new THREE.PointsMaterial({ color: GOLD, size: 0.025, transparent: true, opacity: 0.35 })
    const trail = new THREE.Points(trailGeo, trailMat)
    scene.add(trail)

    let animationId: number
    const animate = (t: number) => {
      const time = t * 0.001
      main.rotation.x = time * 0.6 + Math.sin(time * 2) * 0.15
      main.rotation.y = time * 0.8
      main.rotation.z = Math.sin(time * 1.5) * 0.1
      wire.rotation.x = main.rotation.x
      wire.rotation.y = main.rotation.y
      wire.rotation.z = main.rotation.z
      const pulse = 1 + Math.sin(time * 3) * 0.03
      main.scale.set(pulse, pulse, pulse)
      rings.forEach((ring, i) => {
        ring.rotation.z = time * (0.3 + i * 0.15) + i
        ring.rotation.x = Math.PI / 2 + Math.sin(time * 0.5 + i) * 0.4
      })
      trail.rotation.y = time * 0.15
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
