import Lenis from 'lenis'
import { useEffect, useRef } from 'react'
import { useLocation } from '@tanstack/react-router'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

export default function LenisSmoothScrollProvider() {
  const lenisRef = useRef<Lenis | null>(null)
  const location = useLocation()

  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    })

    lenisRef.current = lenis

    lenis.on('scroll', ScrollTrigger.update)

    gsap.ticker.add((time) => {
      lenis.raf(time * 1000)
    })

    gsap.ticker.lagSmoothing(0)

    return () => {
      lenis.destroy()
    }
  }, [])

  // disable smooth scroll on build pages, it breaks normal scrolling there
  useEffect(() => {
    const lenis = lenisRef.current
    if (!lenis) return

    if (location.pathname.startsWith('/build')) {
      lenis.stop()
    } else {
      lenis.start()
    }
  }, [location.pathname])

  // scroll to top on route change
  useEffect(() => {
    if (location.pathname.startsWith('/build')) {
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
