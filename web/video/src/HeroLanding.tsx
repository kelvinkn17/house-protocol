import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
  staticFile,
  Img,
} from 'remotion'
import { loadFont } from '@remotion/google-fonts/Inter'
import { loadFont as loadMono } from '@remotion/google-fonts/SpaceMono'

const { fontFamily: inter } = loadFont('normal', {
  weights: ['400', '700', '900'],
  subsets: ['latin'],
})

const { fontFamily: mono } = loadMono('normal', {
  weights: ['400', '700'],
  subsets: ['latin'],
})

const LIME = '#CDFF57'
const BG = '#e5e2dc'
const PINK = '#FF6B9D'

// mascot face as inline svg
function Mascot({ size, opacity, scale }: { size: number; opacity: number; scale: number }) {
  const r = size / 2
  return (
    <div style={{
      width: size, height: size, opacity,
      transform: `scale(${scale})`,
    }}>
      <svg viewBox="0 0 200 200" width={size} height={size}>
        {/* shadow */}
        <ellipse cx="100" cy="192" rx="70" ry="8" fill="rgba(0,0,0,0.12)" />
        {/* body */}
        <circle cx="100" cy="100" r="90" fill={LIME} />
        <circle cx="100" cy="100" r="90" fill="url(#mascotGrad)" />
        <circle cx="100" cy="100" r="90" stroke="black" strokeWidth="4" fill="none" />
        {/* gradient for 3d */}
        <defs>
          <radialGradient id="mascotGrad" cx="40%" cy="35%" r="60%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.08)" />
          </radialGradient>
        </defs>
        {/* left eye */}
        <ellipse cx="70" cy="82" rx="22" ry="26" fill="white" stroke="black" strokeWidth="3" />
        <ellipse cx="75" cy="84" rx="12" ry="14" fill="black" />
        <ellipse cx="78" cy="79" rx="5" ry="6" fill="white" />
        {/* right eye */}
        <ellipse cx="130" cy="82" rx="22" ry="26" fill="white" stroke="black" strokeWidth="3" />
        <ellipse cx="135" cy="84" rx="12" ry="14" fill="black" />
        <ellipse cx="138" cy="79" rx="5" ry="6" fill="white" />
        {/* cheeks */}
        <ellipse cx="48" cy="118" rx="16" ry="11" fill={PINK} opacity="0.5" />
        <ellipse cx="152" cy="118" rx="16" ry="11" fill={PINK} opacity="0.5" />
        {/* mouth */}
        <path d="M 65 120 Q 80 155 100 155 Q 120 155 135 120" fill="none" stroke="black" strokeWidth="4" strokeLinecap="round" />
      </svg>
    </div>
  )
}

export const HeroLanding = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // subtle bg drift for dot pattern
  const bgX = frame * 0.3
  const bgY = frame * 0.15

  // gentle float after everything settles (starts at frame 60)
  const floatPhase = Math.max(0, frame - 60)
  const floatY = Math.sin(floatPhase * 0.04) * 4
  const floatX = Math.cos(floatPhase * 0.03) * 3

  // === ENTRY ANIMATIONS ===

  // 1. background panel
  const bgOpacity = interpolate(frame, [0, 12], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // 2. top bar (logo + nav)
  const topBarY = interpolate(frame, [0, 18], [-40, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })
  const topBarOpacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // 3. badge
  const badgeSpring = spring({ frame: Math.max(0, frame - 6), fps, config: { damping: 12, stiffness: 100 } })
  const badgeY = interpolate(badgeSpring, [0, 1], [-30, 0])
  const badgeOpacity = interpolate(frame, [6, 14], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // 4. headline lines (staggered)
  const line1Spring = spring({ frame: Math.max(0, frame - 10), fps, config: { damping: 14, stiffness: 80 } })
  const line1X = interpolate(line1Spring, [0, 1], [-80, 0])
  const line1Opacity = interpolate(frame, [10, 18], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const line2Spring = spring({ frame: Math.max(0, frame - 15), fps, config: { damping: 14, stiffness: 80 } })
  const line2X = interpolate(line2Spring, [0, 1], [-80, 0])
  const line2Opacity = interpolate(frame, [15, 23], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const line3Spring = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 12, stiffness: 100 } })
  const line3Scale = interpolate(line3Spring, [0, 1], [0.7, 1])
  const line3Opacity = interpolate(frame, [20, 28], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // 5. mascot
  const mascotSpring = spring({ frame: Math.max(0, frame - 22), fps, config: { damping: 10, stiffness: 90 } })
  const mascotScale = interpolate(mascotSpring, [0, 1], [0.3, 1])
  const mascotOpacity = interpolate(frame, [22, 30], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const mascotX = interpolate(mascotSpring, [0, 1], [60, 0])

  // 6. speech bubble
  const bubbleSpring = spring({ frame: Math.max(0, frame - 28), fps, config: { damping: 12, stiffness: 120 } })
  const bubbleScale = interpolate(bubbleSpring, [0, 1], [0.4, 1])
  const bubbleOpacity = interpolate(frame, [28, 34], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // 7. subtitle
  const subOpacity = interpolate(frame, [32, 42], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const subY = interpolate(frame, [32, 44], [16, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })

  // 8. CTA buttons
  const cta1Spring = spring({ frame: Math.max(0, frame - 38), fps, config: { damping: 14, stiffness: 100 } })
  const cta1Y = interpolate(cta1Spring, [0, 1], [30, 0])
  const cta1Opacity = interpolate(frame, [38, 46], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const cta2Spring = spring({ frame: Math.max(0, frame - 42), fps, config: { damping: 14, stiffness: 100 } })
  const cta2Y = interpolate(cta2Spring, [0, 1], [30, 0])
  const cta2Opacity = interpolate(frame, [42, 50], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // 9. powered by badge
  const poweredOpacity = interpolate(frame, [44, 55], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const poweredY = interpolate(frame, [44, 56], [14, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })

  return (
    <div style={{
      width: '100%', height: '100%',
      backgroundColor: '#0a0a0c',
      fontFamily: inter,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* main panel with rounded corners */}
      <div style={{
        width: 1880, height: 1020,
        backgroundColor: BG,
        borderRadius: 32,
        position: 'relative',
        overflow: 'hidden',
        opacity: bgOpacity,
      }}>
        {/* subtle dot pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          backgroundPosition: `${bgX}px ${bgY}px`,
        }} />

        {/* top bar: logo + nav */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '36px 56px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          opacity: topBarOpacity,
          transform: `translateY(${topBarY}px)`,
          zIndex: 10,
        }}>
          {/* logo */}
          <div style={{
            fontSize: 28, fontWeight: 900, color: 'black',
            fontFamily: inter, letterSpacing: '-0.02em',
            backgroundColor: LIME, padding: '10px 20px',
            borderRadius: 8,
          }}>
            HOUSE PROTOCOL
          </div>

          {/* nav */}
          <div style={{ display: 'flex', gap: 48 }}>
            {['STAKERS', 'BUILDERS', 'PLAY', 'FAUCET'].map((item) => (
              <span key={item} style={{
                fontSize: 18, fontWeight: 700, color: 'black',
                fontFamily: inter, letterSpacing: '0.04em',
              }}>
                {item}
              </span>
            ))}
          </div>

          {/* wallet pill */}
          <div style={{
            backgroundColor: 'black', borderRadius: 100,
            padding: '12px 28px',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <span style={{ fontSize: 16, color: 'white', fontFamily: inter, fontWeight: 700 }}>
              0x278...4ECf
            </span>
          </div>
        </div>

        {/* === MAIN CONTENT === */}
        <div style={{
          position: 'absolute',
          top: 130, left: 56, right: 56, bottom: 40,
          display: 'flex',
        }}>
          {/* left column: text content */}
          <div style={{
            flex: 1,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: 40,
          }}>
            {/* badge */}
            <div style={{
              opacity: badgeOpacity,
              transform: `translateY(${badgeY}px)`,
              marginBottom: 36,
              display: 'flex',
            }}>
              <div style={{
                backgroundColor: LIME,
                border: '2.5px solid black',
                borderRadius: 100,
                padding: '12px 28px',
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: 5,
                  backgroundColor: 'black',
                }} />
                <span style={{
                  fontSize: 17, fontWeight: 900, color: 'black',
                  fontFamily: inter, letterSpacing: '0.04em',
                }}>
                  ETHGLOBAL HACKMONEY 2026 SUBMISSION
                </span>
              </div>
            </div>

            {/* headline */}
            <div style={{ marginBottom: 32 }}>
              {/* EVERYONE */}
              <div style={{
                opacity: line1Opacity,
                transform: `translateX(${line1X}px)`,
              }}>
                <span style={{
                  fontSize: 138, fontWeight: 900, color: 'black',
                  fontFamily: inter, lineHeight: 0.92,
                  letterSpacing: '-0.04em',
                  display: 'block',
                }}>
                  EVERYONE
                </span>
              </div>

              {/* CAN BE THE */}
              <div style={{
                opacity: line2Opacity,
                transform: `translateX(${line2X}px)`,
              }}>
                <span style={{
                  fontSize: 138, fontWeight: 900, color: 'black',
                  fontFamily: inter, lineHeight: 0.92,
                  letterSpacing: '-0.04em',
                  display: 'block',
                }}>
                  CAN BE THE
                </span>
              </div>

              {/* HOUSE. */}
              <div style={{
                opacity: line3Opacity,
                transform: `scale(${line3Scale})`,
                transformOrigin: 'left center',
              }}>
                <span style={{
                  fontSize: 160, fontWeight: 900,
                  color: LIME,
                  fontFamily: inter, lineHeight: 0.92,
                  letterSpacing: '-0.04em',
                  display: 'block',
                  WebkitTextStroke: '3px black',
                  paintOrder: 'stroke fill',
                }}>
                  HOUSE.
                </span>
              </div>
            </div>

            {/* subtitle */}
            <div style={{
              opacity: subOpacity,
              transform: `translateY(${subY}px)`,
              marginBottom: 44,
            }}>
              <span style={{
                fontSize: 22, color: 'rgba(0,0,0,0.55)',
                fontFamily: inter, fontWeight: 400,
                lineHeight: 1.5,
              }}>
                ** Yield from real probability, not inflation.
              </span>
            </div>

            {/* bottom row: powered by + CTAs */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 28,
            }}>
              {/* powered by */}
              <div style={{
                opacity: poweredOpacity,
                transform: `translateY(${poweredY}px)`,
                backgroundColor: 'white',
                border: '2.5px solid black',
                borderRadius: 18,
                padding: '16px 24px',
                display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                <span style={{
                  fontSize: 11, fontFamily: mono,
                  letterSpacing: '0.12em', color: 'rgba(0,0,0,0.5)',
                }}>
                  POWERED BY
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <Img src={staticFile('erc7824.png')} style={{ height: 38, width: 'auto' }} />
                  <div style={{ width: 1, height: 24, backgroundColor: 'rgba(0,0,0,0.15)' }} />
                  <span style={{
                    fontSize: 14, fontWeight: 700, color: 'rgba(0,0,0,0.6)',
                    fontFamily: inter,
                  }}>
                    Gasless & Instant
                  </span>
                </div>
              </div>

              <div style={{ flex: 1 }} />

              {/* START STAKING */}
              <div style={{
                opacity: cta1Opacity,
                transform: `translateY(${cta1Y}px)`,
              }}>
                <div style={{
                  backgroundColor: 'black',
                  border: '2.5px solid black',
                  borderRadius: 100,
                  padding: '20px 48px',
                  boxShadow: `4px 4px 0px ${PINK}`,
                }}>
                  <span style={{
                    fontSize: 20, fontWeight: 900, color: 'white',
                    fontFamily: inter, letterSpacing: '0.06em',
                  }}>
                    START STAKING
                  </span>
                </div>
              </div>

              {/* BUILD A GAME */}
              <div style={{
                opacity: cta2Opacity,
                transform: `translateY(${cta2Y}px)`,
              }}>
                <div style={{
                  backgroundColor: 'white',
                  border: '2.5px solid black',
                  borderRadius: 100,
                  padding: '20px 48px',
                }}>
                  <span style={{
                    fontSize: 20, fontWeight: 900, color: 'black',
                    fontFamily: inter, letterSpacing: '0.06em',
                  }}>
                    BUILD A GAME
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* right column: mascot + speech bubble */}
          <div style={{
            width: 440,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}>
            {/* speech bubble */}
            <div style={{
              opacity: bubbleOpacity,
              transform: `scale(${bubbleScale}) translateY(${floatY * 0.5}px)`,
              transformOrigin: 'center bottom',
              marginBottom: 20,
              position: 'relative',
            }}>
              <div style={{
                backgroundColor: LIME,
                border: '3px solid black',
                borderRadius: 22,
                padding: '20px 32px',
                boxShadow: '5px 5px 0px rgba(0,0,0,0.15)',
                position: 'relative',
              }}>
                <span style={{
                  fontSize: 22, fontWeight: 700, color: 'black',
                  fontFamily: inter, textAlign: 'center',
                  display: 'block', whiteSpace: 'nowrap',
                }}>
                  "Provably fair, actually fun"
                </span>
                {/* triangle pointer */}
                <div style={{
                  position: 'absolute', bottom: -18, left: '50%',
                  marginLeft: -14,
                  width: 0, height: 0,
                  borderLeft: '14px solid transparent',
                  borderRight: '14px solid transparent',
                  borderTop: `18px solid ${LIME}`,
                }} />
                <div style={{
                  position: 'absolute', bottom: -23, left: '50%',
                  marginLeft: -17,
                  width: 0, height: 0,
                  borderLeft: '17px solid transparent',
                  borderRight: '17px solid transparent',
                  borderTop: '22px solid black',
                  zIndex: -1,
                }} />
              </div>
            </div>

            {/* mascot */}
            <div style={{
              transform: `translateX(${mascotX + floatX}px) translateY(${floatY}px)`,
            }}>
              <Mascot size={300} opacity={mascotOpacity} scale={mascotScale} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
