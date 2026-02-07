'use client'

import { useEffect, useRef } from 'react'
import { useAnimate } from 'motion/react'

const EASE_OUT_QUINT = [0.22, 1, 0.36, 1] as [number, number, number, number]
const EASE_EXPO_OUT = [0.16, 1, 0.3, 1] as [number, number, number, number]
const LOGO_ASPECT = 1373 / 452

interface IntroAnimationProps {
  onComplete: () => void
}

export default function IntroAnimation({ onComplete }: IntroAnimationProps) {
  const [scope, animate] = useAnimate()
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = 'hidden'
    document.body.style.paddingRight = `${scrollbarWidth}px`

    const isSm = window.innerWidth >= 640
    const vw = window.innerWidth
    const endH = isSm ? 64 : 48
    const padding = isSm ? 24 : 16
    const navLeft = Math.max(padding, (vw - 1280) / 2)
    const navTop = (80 - endH) / 2
    const morphLR = isSm ? 24 : 8
    const morphBR = isSm ? '32px 32px 0 0' : '24px 24px 0 0'

    async function sequence() {
      animate(
        '#logo-img',
        { opacity: 1, scale: 1 },
        { duration: 0.5, ease: EASE_EXPO_OUT },
      )
      await animate(
        '#logo-img',
        { clipPath: 'inset(0 0% 0 0)' },
        { duration: 0.8, delay: 0.15, ease: EASE_OUT_QUINT },
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
      animate(
        '#logo-wrapper',
        {
          top: `${navTop}px`,
          left: `${navLeft}px`,
          height: `${endH}px`,
          width: `${endH * LOGO_ASPECT}px`,
        },
        { duration: 1.1, ease: EASE_OUT_QUINT },
      )
      animate(
        '#overlay',
        {
          top: '80px',
          left: `${morphLR}px`,
          right: `${morphLR}px`,
          borderRadius: morphBR,
        },
        { duration: 1.1, ease: EASE_OUT_QUINT },
      )
      await animate(
        '#overlay',
        { opacity: 0 },
        { duration: 0.5, delay: 1.1, ease: 'easeOut' },
      )

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
