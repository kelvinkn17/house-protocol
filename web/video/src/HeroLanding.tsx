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
const BG = '#EDEBE6'
const PINK = '#FF6B9D'

export const HeroLanding = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // subtle bg drift for dot pattern
  const bgX = frame * 0.3
  const bgY = frame * 0.15

  // gentle float after everything settles
  const floatPhase = Math.max(0, frame - 60)
  const floatY = Math.sin(floatPhase * 0.04) * 5
  const floatX = Math.cos(floatPhase * 0.03) * 3

  // === ENTRY ANIMATIONS ===

  // bg
  const bgOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // badge
  const badgeSpring = spring({ frame: Math.max(0, frame - 4), fps, config: { damping: 12, stiffness: 100 } })
  const badgeY = interpolate(badgeSpring, [0, 1], [-30, 0])
  const badgeOpacity = interpolate(frame, [4, 12], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // headline staggered
  const line1Spring = spring({ frame: Math.max(0, frame - 8), fps, config: { damping: 14, stiffness: 80 } })
  const line1X = interpolate(line1Spring, [0, 1], [-80, 0])
  const line1Opacity = interpolate(frame, [8, 16], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const line2Spring = spring({ frame: Math.max(0, frame - 13), fps, config: { damping: 14, stiffness: 80 } })
  const line2X = interpolate(line2Spring, [0, 1], [-80, 0])
  const line2Opacity = interpolate(frame, [13, 21], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const line3Spring = spring({ frame: Math.max(0, frame - 18), fps, config: { damping: 12, stiffness: 100 } })
  const line3Scale = interpolate(line3Spring, [0, 1], [0.7, 1])
  const line3Opacity = interpolate(frame, [18, 26], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // mascot
  const mascotSpring = spring({ frame: Math.max(0, frame - 20), fps, config: { damping: 10, stiffness: 90 } })
  const mascotScale = interpolate(mascotSpring, [0, 1], [0.3, 1])
  const mascotOpacity = interpolate(frame, [20, 28], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const mascotX = interpolate(mascotSpring, [0, 1], [60, 0])

  // speech bubble
  const bubbleSpring = spring({ frame: Math.max(0, frame - 26), fps, config: { damping: 12, stiffness: 120 } })
  const bubbleScale = interpolate(bubbleSpring, [0, 1], [0.4, 1])
  const bubbleOpacity = interpolate(frame, [26, 32], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // subtitle
  const subOpacity = interpolate(frame, [30, 40], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const subY = interpolate(frame, [30, 42], [16, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })

  // CTAs
  const cta1Spring = spring({ frame: Math.max(0, frame - 36), fps, config: { damping: 14, stiffness: 100 } })
  const cta1Y = interpolate(cta1Spring, [0, 1], [30, 0])
  const cta1Opacity = interpolate(frame, [36, 44], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  const cta2Spring = spring({ frame: Math.max(0, frame - 40), fps, config: { damping: 14, stiffness: 100 } })
  const cta2Y = interpolate(cta2Spring, [0, 1], [30, 0])
  const cta2Opacity = interpolate(frame, [40, 48], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })

  // powered by
  const poweredOpacity = interpolate(frame, [42, 52], [0, 1], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  })
  const poweredY = interpolate(frame, [42, 54], [14, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  })

  return (
    <div style={{
      width: '100%', height: '100%',
      backgroundColor: BG,
      fontFamily: inter,
      overflow: 'hidden',
      opacity: bgOpacity,
      position: 'relative',
    }}>
      {/* subtle dot pattern */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        backgroundPosition: `${bgX}px ${bgY}px`,
      }} />

      {/* main content area */}
      <div style={{
        position: 'absolute',
        top: 80, left: 100, right: 100, bottom: 80,
        display: 'flex',
      }}>
        {/* left column */}
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
            marginBottom: 40,
            display: 'flex',
          }}>
            <div style={{
              backgroundColor: LIME,
              border: '2.5px solid black',
              borderRadius: 100,
              padding: '14px 32px',
              display: 'flex', alignItems: 'center', gap: 14,
              boxShadow: '3px 3px 0px black',
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: 6,
                backgroundColor: 'black',
              }} />
              <span style={{
                fontSize: 18, fontWeight: 900, color: 'black',
                fontFamily: inter, letterSpacing: '0.04em',
              }}>
                ETHGLOBAL HACKMONEY 2026 SUBMISSION
              </span>
            </div>
          </div>

          {/* headline */}
          <div style={{ marginBottom: 36 }}>
            <div style={{
              opacity: line1Opacity,
              transform: `translateX(${line1X}px)`,
            }}>
              <span style={{
                fontSize: 148, fontWeight: 900, color: 'black',
                fontFamily: inter, lineHeight: 0.9,
                letterSpacing: '-0.04em',
                display: 'block',
              }}>
                EVERYONE
              </span>
            </div>

            <div style={{
              opacity: line2Opacity,
              transform: `translateX(${line2X}px)`,
            }}>
              <span style={{
                fontSize: 148, fontWeight: 900, color: 'black',
                fontFamily: inter, lineHeight: 0.9,
                letterSpacing: '-0.04em',
                display: 'block',
              }}>
                CAN BE THE
              </span>
            </div>

            <div style={{
              opacity: line3Opacity,
              transform: `scale(${line3Scale})`,
              transformOrigin: 'left center',
            }}>
              <span style={{
                fontSize: 172, fontWeight: 900,
                color: LIME,
                fontFamily: inter, lineHeight: 0.9,
                letterSpacing: '-0.04em',
                display: 'block',
                WebkitTextStroke: '3px black',
                paintOrder: 'stroke fill',
                textShadow: '6px 6px 0px black',
              }}>
                HOUSE.
              </span>
            </div>
          </div>

          {/* subtitle */}
          <div style={{
            opacity: subOpacity,
            transform: `translateY(${subY}px)`,
            marginBottom: 48,
          }}>
            <span style={{
              fontSize: 24, color: 'rgba(0,0,0,0.55)',
              fontFamily: mono, fontWeight: 400,
              lineHeight: 1.5,
            }}>
              ** Yield from real probability, not inflation.
            </span>
          </div>

          {/* bottom row */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 24,
          }}>
            {/* powered by */}
            <div style={{
              opacity: poweredOpacity,
              transform: `translateY(${poweredY}px)`,
              backgroundColor: 'white',
              border: '2.5px solid black',
              borderRadius: 20,
              padding: '18px 28px',
              display: 'flex', flexDirection: 'column', gap: 8,
              boxShadow: '4px 4px 0px black',
            }}>
              <span style={{
                fontSize: 11, fontFamily: mono,
                letterSpacing: '0.12em', color: 'rgba(0,0,0,0.5)',
              }}>
                POWERED BY
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <Img src={staticFile('erc7824.png')} style={{ height: 42, width: 'auto' }} />
                <div style={{ width: 1, height: 28, backgroundColor: 'rgba(0,0,0,0.2)' }} />
                <span style={{
                  fontSize: 15, fontWeight: 700, color: 'rgba(0,0,0,0.6)',
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
                borderRadius: 100,
                padding: '22px 52px',
                boxShadow: `4px 4px 0px ${PINK}`,
              }}>
                <span style={{
                  fontSize: 22, fontWeight: 900, color: 'white',
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
                padding: '22px 52px',
                boxShadow: '4px 4px 0px black',
              }}>
                <span style={{
                  fontSize: 22, fontWeight: 900, color: 'black',
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
          width: 480,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}>
          {/* speech bubble */}
          <div style={{
            opacity: bubbleOpacity,
            transform: `scale(${bubbleScale}) translateY(${floatY * 0.5}px) rotate(5deg)`,
            transformOrigin: 'center bottom',
            marginBottom: 16,
            position: 'relative',
          }}>
            <div style={{
              backgroundColor: LIME,
              border: '3px solid black',
              borderRadius: 22,
              padding: '22px 36px',
              boxShadow: '5px 5px 0px black',
              position: 'relative',
            }}>
              <span style={{
                fontSize: 24, fontWeight: 900, color: 'black',
                fontFamily: inter, textAlign: 'center',
                display: 'block', whiteSpace: 'nowrap',
              }}>
                "Provably fair, actually fun"
              </span>
              {/* triangle pointer (border layer behind) */}
              <div style={{
                position: 'absolute', bottom: -19, left: '50%',
                marginLeft: -16,
                width: 0, height: 0,
                borderLeft: '16px solid transparent',
                borderRight: '16px solid transparent',
                borderTop: '20px solid black',
              }} />
              {/* triangle pointer (fill layer) */}
              <div style={{
                position: 'absolute', bottom: -14, left: '50%',
                marginLeft: -13,
                width: 0, height: 0,
                borderLeft: '13px solid transparent',
                borderRight: '13px solid transparent',
                borderTop: `17px solid ${LIME}`,
              }} />
            </div>
          </div>

          {/* mascot face (actual asset) */}
          <div style={{
            opacity: mascotOpacity,
            transform: `scale(${mascotScale}) translateX(${mascotX + floatX}px) translateY(${floatY}px)`,
            filter: 'drop-shadow(6px 6px 0px rgba(0,0,0,0.3))',
          }}>
            <Img src={staticFile('hp-face.svg')} style={{ width: 320, height: 'auto' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
