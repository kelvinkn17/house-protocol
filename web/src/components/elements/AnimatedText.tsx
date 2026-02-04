'use client'

import { motion, useInView } from 'motion/react'
import { useRef } from 'react'

interface AnimatedTextProps {
  text: string
  className?: string
  /** delay before animation starts in ms */
  delay?: number
  /** stagger between each letter in ms */
  stagger?: number
  /** special styling for this line (like the HOUSE. text) */
  style?: React.CSSProperties
  /** trigger animation when scrolled into view */
  onScroll?: boolean
}

// clean bouncy easing
const easing = [0.34, 1.56, 0.64, 1] as const

export default function AnimatedText({
  text,
  className,
  delay = 0,
  stagger = 25,
  style,
  onScroll = false,
}: AnimatedTextProps) {
  const ref = useRef<HTMLSpanElement>(null)
  // trigger when element enters bottom 35% of viewport
  const isInView = useInView(ref, { once: true, margin: '0px 0px -30% 0px' })

  const letters = text.split('')
  const delayInSec = delay / 1000
  const staggerInSec = stagger / 1000

  const shouldAnimate = onScroll ? isInView : true

  return (
    <span ref={ref} className={className} style={style}>
      {letters.map((letter, i) => (
        <motion.span
          key={i}
          initial={{ y: 40, opacity: 0, scale: 0.9 }}
          animate={shouldAnimate ? { y: 0, opacity: 1, scale: 1 } : { y: 40, opacity: 0, scale: 0.9 }}
          transition={{
            duration: 0.4,
            delay: delayInSec + i * staggerInSec,
            ease: easing,
          }}
          className="inline-block"
          style={{
            // preserve spaces
            whiteSpace: letter === ' ' ? 'pre' : undefined,
          }}
        >
          {letter === ' ' ? '\u00A0' : letter}
        </motion.span>
      ))}
    </span>
  )
}
