import Lenis from 'lenis'
import { useEffect, useRef, useCallback } from 'react'
import { useLocation } from '@tanstack/react-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function LenisSmoothScrollProvider() {
  const lenisRef = useRef<Lenis | null>(null)
  const tickerRef = useRef<((time: number) => void) | null>(null)
  const location = useLocation()
  const isBuild = location.pathname.startsWith('/build')

  const createLenis = useCallback(() => {
    if (lenisRef.current) return

    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    })

    lenisRef.current = lenis
    lenis.on('scroll', ScrollTrigger.update)

    const tick = (time: number) => {
      lenis.raf(time * 1000)
    }
    tickerRef.current = tick
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
  }, [])

  const destroyLenis = useCallback(() => {
    if (tickerRef.current) {
      gsap.ticker.remove(tickerRef.current)
      tickerRef.current = null
    }
    if (lenisRef.current) {
      lenisRef.current.destroy()
      lenisRef.current = null
    }
  }, [])

  // create or destroy based on route
  useEffect(() => {
    if (isBuild) {
      destroyLenis()
    } else {
      createLenis()
    }
  }, [isBuild, createLenis, destroyLenis])

  // cleanup on unmount
  useEffect(() => {
    return () => destroyLenis()
  }, [destroyLenis])

  // scroll to top on route change
  useEffect(() => {
    if (isBuild) {
      window.scrollTo(0, 0)
      return
    }
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true })
    } else {
      window.scrollTo(0, 0)
    }
  }, [location.pathname])

  return null
}
