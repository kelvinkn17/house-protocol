'use client'

import { motion, useInView } from 'motion/react'
import { useMemo, useRef } from 'react'

type AnimateVariant = 'default' | 'fadeIn' | 'fadeInUp' | 'fadeInDown' | 'scaleIn' | 'none'

interface AnimateComponentProps {
  children: React.ReactNode
  className?: string
  variant?: AnimateVariant
  /** delay in ms */
  delay?: number
  /** duration in seconds */
  duration?: number
  /** trigger animation when scrolled into view */
  onScroll?: boolean
  /** intersection threshold 0-1 */
  threshold?: number
  /** only animate once */
  once?: boolean
  /** external trigger override, useful when parent controls animation timing */
  trigger?: boolean
}

// random rotation either -15 to -10 OR 10 to 15
function getRandomRotation(): number {
  const isNegative = Math.random() > 0.5
  if (isNegative) {
    return -15 + Math.random() * 5 // -15 to -10
  }
  return 10 + Math.random() * 5 // 10 to 15
}

// cubic bezier approximations for gsap easings
const easing = {
  // back.out(1.2) - bouncy
  backOut: [0.34, 1.56, 0.64, 1] as const,
  // expo.out - snappy
  expoOut: [0.16, 1, 0.3, 1] as const,
}

export default function AnimateComponent({
  children,
  className,
  variant = 'default',
  delay = 0,
  duration = 0.45,
  onScroll = false,
  threshold = 0.2,
  once = true,
  trigger,
}: AnimateComponentProps) {
  const ref = useRef<HTMLDivElement>(null)
  // trigger when element enters bottom 15% of viewport
  const isInView = useInView(ref, { once, margin: '0px 0px -15% 0px' })

  // memoize so rotation stays consistent across re-renders
  const randomRotation = useMemo(() => getRandomRotation(), [])

  // priority: trigger prop > onScroll > default (animate immediately)
  const shouldAnimate =
    trigger !== undefined ? trigger : onScroll ? isInView : true
  const delayInSec = delay / 1000

  if (variant === 'none') {
    return <div className={className}>{children}</div>
  }

  // default variant: the fun bouncy one with random rotation + scale pop
  // using separate motion.divs for stability, each handles one concern
  if (variant === 'default') {
    return (
      // outer: rotation
      <motion.div
        ref={ref}
        initial={{ rotate: randomRotation }}
        animate={shouldAnimate ? { rotate: 0 } : { rotate: randomRotation }}
        transition={{
          duration: duration * 0.85,
          delay: delayInSec,
          ease: easing.backOut,
        }}
        className={className}
      >
        {/* middle: scale pop */}
        <motion.div
          initial={{ scale: 0.88 }}
          animate={shouldAnimate ? { scale: 1 } : { scale: 0.88 }}
          transition={{
            duration: duration * 0.75,
            delay: delayInSec + 0.03,
            ease: easing.backOut,
          }}
        >
          {/* inner: y translation + opacity */}
          <motion.div
            initial={{ y: 28, opacity: 0 }}
            animate={shouldAnimate ? { y: 0, opacity: 1 } : { y: 28, opacity: 0 }}
            transition={{
              duration: duration,
              delay: delayInSec,
              ease: easing.expoOut,
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }

  // simpler variants, single motion.div
  const variants: Record<
    Exclude<AnimateVariant, 'default' | 'none'>,
    { initial: object; animate: object }
  > = {
    fadeIn: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
    },
    fadeInUp: {
      initial: { y: 24, opacity: 0 },
      animate: { y: 0, opacity: 1 },
    },
    fadeInDown: {
      initial: { y: -24, opacity: 0 },
      animate: { y: 0, opacity: 1 },
    },
    scaleIn: {
      initial: { scale: 0.92, opacity: 0 },
      animate: { scale: 1, opacity: 1 },
    },
  }

  const currentVariant = variants[variant]

  return (
    <motion.div
      ref={ref}
      initial={currentVariant.initial}
      animate={shouldAnimate ? currentVariant.animate : currentVariant.initial}
      transition={{
        duration,
        delay: delayInSec,
        ease: easing.expoOut,
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
