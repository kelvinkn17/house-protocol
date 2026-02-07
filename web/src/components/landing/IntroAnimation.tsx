'use client'

import { useEffect, useRef } from 'react'
import { useAnimate } from 'motion/react'

const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as [number, number, number, number]
const EASE_EXPO_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]
const LOGO_ASPECT = 1373 / 452

interface IntroAnimationProps {
  onComplete: () => void
  onHeroStart?: () => void
}

export default function IntroAnimation({
  onComplete,
  onHeroStart,
}: IntroAnimationProps) {
  const [scope, animate] = useAnimate()
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete
  const onHeroStartRef = useRef(onHeroStart)
  onHeroStartRef.current = onHeroStart

  useEffect(() => {
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    const isSm = window.innerWidth >= 640
    const morphLR = isSm ? 24 : 8
    const morphBR = isSm ? '32px 32px 0 0' : '24px 24px 0 0'
    const navLogo = document.querySelector(
      'header img[alt="House Protocol"]',
    ) as HTMLElement
    const navRect = navLogo?.getBoundingClientRect()

    async function sequence() {
      animate(
        '#logo-img',
        { opacity: 1, scale: 1 },
        { duration: 0.5, ease: EASE_EXPO_OUT },
      )
      await animate(
        '#logo-img',
        { clipPath: 'inset(0 0% 0 0)' },
        { duration: 0.65, delay: 0.15, ease: EASE_OUT_QUINT },
      )

      const wrapper = scope.current?.querySelector(
        '#logo-wrapper',
      ) as HTMLElement
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect()
        wrapper.style.top = `${rect.top}px`
        wrapper.style.left = `${rect.left}px`
        wrapper.style.width = `${rect.width}px`
        wrapper.style.height = `${rect.height}px`
        wrapper.style.transform = 'none'
      }
      const logoMorph = animate(
        '#logo-wrapper',
        {
          top: `${navRect!.top}px`,
          left: `${navRect!.left}px`,
          height: `${navRect!.height}px`,
          width: `${navRect!.width}px`,
        },
        { duration: 0.9, ease: EASE_OUT_QUINT },
      )
      animate(
        '#overlay',
        {
          top: '80px',
          left: `${morphLR}px`,
          right: `${morphLR}px`,
          borderRadius: morphBR,
        },
        { duration: 0.9, ease: EASE_OUT_QUINT },
      )
      await Promise.race([logoMorph, new Promise((r) => setTimeout(r, 700))])
      onHeroStartRef.current?.()
      animate(
        '#overlay',
        { opacity: 0 },
        { duration: 0.25, ease: EASE_EXPO_OUT },
      )
      await logoMorph
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
      onCompleteRef.current()
    }

    sequence()

    return () => {
      document.body.style.overflow = ''
      document.body.style.paddingRight = ''
    }
  }, [animate, scope])

  return (
    <div ref={scope}>
      <div id="overlay" className="fixed inset-0 z-50 bg-[#EDEBE6]" />

      <div
        id="logo-wrapper"
        className="fixed z-51 pointer-events-none overflow-hidden"
        style={{
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          height: 'clamp(72px, 12vw, 120px)',
          width: `calc(clamp(72px, 12vw, 120px) * ${LOGO_ASPECT})`,
        }}
      >
        <img
          id="logo-img"
          src="/assets/logos/house-protocol-horizontal-logo.svg"
          alt="House Protocol"
          className="w-full h-full"
          style={{
            opacity: 0,
            transform: 'scale(0.85)',
            clipPath: 'inset(0 100% 0 0)',
          }}
        />
      </div>
    </div>
  )
}
