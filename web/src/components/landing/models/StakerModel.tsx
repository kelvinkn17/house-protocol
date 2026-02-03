import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const GOLD = 0xcbad6d
const DARK_GOLD = 0x8a7440

export default function StakerModel() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const w = 160
    const h = 160

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(w, h)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    container.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100)
    camera.position.set(0, 0.5, 5)

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

    // outer octahedron wireframe
    const outerGeo = new THREE.OctahedronGeometry(1.3, 0)
    const outerMat = new THREE.MeshBasicMaterial({
      color: GOLD,
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    })
    const outer = new THREE.Mesh(outerGeo, outerMat)
    scene.add(outer)

    // middle octahedron solid
    const midGeo = new THREE.OctahedronGeometry(1.0, 0)
    const midMat = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,
      emissive: DARK_GOLD,
      emissiveIntensity: 0.15,
      transparent: true,
      opacity: 0.6,
      shininess: 120,
      specular: new THREE.Color(GOLD),
    })
    const mid = new THREE.Mesh(midGeo, midMat)
    scene.add(mid)

    // inner cube core
    const innerGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55)
    const innerMat = new THREE.MeshPhongMaterial({
      color: GOLD,
      emissive: DARK_GOLD,
      emissiveIntensity: 0.3,
      shininess: 200,
      specular: new THREE.Color(0xffffff),
    })
    const inner = new THREE.Mesh(innerGeo, innerMat)
    scene.add(inner)

    // particles
    const particleGeo = new THREE.BufferGeometry()
    const pCount = 40
    const pPos = new Float32Array(pCount * 3)
    for (let i = 0; i < pCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 1.8 + Math.random() * 0.5
      pPos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pPos[i * 3 + 2] = r * Math.cos(phi)
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3))
    const particleMat = new THREE.PointsMaterial({ color: GOLD, size: 0.03, transparent: true, opacity: 0.5 })
    const particles = new THREE.Points(particleGeo, particleMat)
    scene.add(particles)

    let animationId: number
    const animate = (t: number) => {
      const time = t * 0.001
      outer.rotation.y = time * 0.3
      outer.rotation.x = time * 0.15
      mid.rotation.y = -time * 0.2
      mid.rotation.x = time * 0.1
      inner.rotation.y = time * 0.5
      inner.rotation.x = time * 0.25
      inner.position.y = Math.sin(time * 1.2) * 0.05
      particles.rotation.y = time * 0.08
      particles.rotation.x = time * 0.04
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

  return <div ref={containerRef} className="w-[160px] h-[160px]" />
}
