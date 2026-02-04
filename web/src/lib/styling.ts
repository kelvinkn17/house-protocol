// animation easing configs
// fast, tactile, slightly bouncy without being annoying

export const ease = {
  // primary entry, quick with tiny bounce at end
  entry: 'expo.out',
  // entry with more bounce for cards
  entryBounce: 'back.out(1.2)',
  // snappy for micro interactions
  snap: 'power4.out',
  // bouncy pop for badges, icons, small stuff
  pop: 'back.out(1.7)',
  // smooth for exits and fades
  out: 'power2.inOut',
  // linear for progress bars, countups
  linear: 'none',
} as const

// css transition configs for hover states, etc
export const cssTransition = {
  // snappy hover, slight bounce feel
  card: 'transform 0.15s cubic-bezier(0.34, 1.56, 0.64, 1)',
  // quick button feedback
  button: 'transform 0.12s cubic-bezier(0.34, 1.56, 0.64, 1)',
  // smooth scale
  scale: 'transform 0.18s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
} as const

export const duration = {
  // fast micro interaction
  instant: 0.12,
  // quick element entry
  fast: 0.25,
  // standard entry animation
  normal: 0.32,
  // staggered sequences
  stagger: 0.38,
  // slower reveals, hero stuff
  slow: 0.45,
} as const

export const stagger = {
  // tight stagger for lists
  tight: 0.03,
  // normal stagger
  normal: 0.06,
  // spread out stagger
  loose: 0.1,
} as const

// starting positions, smaller = snappier feel
export const offset = {
  // subtle slide
  small: 12,
  // standard entry
  normal: 22,
  // dramatic entry
  large: 32,
} as const
