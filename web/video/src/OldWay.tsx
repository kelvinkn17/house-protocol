import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  spring,
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

const lines = [
  'locked vaults.',
  'gated access.',
  'house always wins.',
]

// sad faces scattered around
const sadFaces = [
  { x: 180, y: 260, size: 42, delay: 88, rot: -12 },
  { x: 1680, y: 340, size: 36, delay: 95, rot: 8 },
  { x: 320, y: 780, size: 30, delay: 102, rot: -6 },
  { x: 1540, y: 720, size: 48, delay: 108, rot: 14 },
  { x: 960, y: 920, size: 34, delay: 114, rot: -4 },
  { x: 1300, y: 180, size: 28, delay: 100, rot: -10 },
  { x: 600, y: 200, size: 32, delay: 106, rot: 6 },
]

// horizontal bars that slide in like prison bars / restrictive feel
const bars = [
  { y: 160, width: 1920, delay: 10, direction: 1 },
  { y: 380, width: 1400, delay: 16, direction: -1 },
  { y: 600, width: 1700, delay: 22, direction: 1 },
  { y: 820, width: 1200, delay: 28, direction: -1 },
  { y: 960, width: 1920, delay: 34, direction: 1 },
]

export const OldWay = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // bg vignette pulse, subtle
  const vignettePulse = interpolate(
    Math.sin(frame * 0.04),
    [-1, 1],
    [0.7, 0.85]
  )

  // title: "THE OLD WAY" slams in
  const titleSpring = spring({
    frame: Math.max(0, frame - 5),
    fps,
    config: { damping: 10, stiffness: 160 },
  })
  const titleScale = interpolate(titleSpring, [0, 1], [2.5, 1])
  const titleOpacity = interpolate(titleSpring, [0, 0.15], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // title glitch/shake on landing
  const titleShakeX =
    frame > 5 && frame < 18
      ? Math.sin(frame * 3.5) * interpolate(frame, [5, 18], [6, 0], { extrapolateRight: 'clamp' })
      : 0
  const titleShakeY =
    frame > 5 && frame < 18
      ? Math.cos(frame * 4.2) * interpolate(frame, [5, 18], [4, 0], { extrapolateRight: 'clamp' })
      : 0

  // red flash on title slam
  const flashOpacity = interpolate(frame, [8, 16], [0.15, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // lines stagger in
  const lineDelays = [35, 55, 75]

  // whole scene slow drift down
  const sceneDrift = interpolate(frame, [0, 150], [0, -12], {
    extrapolateRight: 'clamp',
  })

  // end fade to darker
  const endDarken = interpolate(frame, [130, 150], [0, 0.6], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
        backgroundColor: '#0A0A0A',
      }}
    >
      {/* scene container with slow drift */}
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          transform: `translateY(${sceneDrift}px)`,
        }}
      >
        {/* subtle noise/grid texture */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(255,50,50,0.03) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
            backgroundPosition: `${frame * 0.2}px ${frame * 0.1}px`,
          }}
        />

        {/* horizontal restriction bars */}
        {bars.map((bar, i) => {
          const barProgress = interpolate(frame, [bar.delay, bar.delay + 20], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
            easing: Easing.out(Easing.cubic),
          })
          const slideX = interpolate(
            barProgress,
            [0, 1],
            [bar.direction * -1920, 0]
          )
          // bars slowly drift
          const drift = frame * 0.15 * bar.direction

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                top: bar.y,
                left: 0,
                width: bar.width,
                height: 3,
                backgroundColor: 'rgba(255,40,40,0.08)',
                transform: `translateX(${slideX + drift}px)`,
              }}
            />
          )
        })}

        {/* red flash overlay on slam */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: '#FF2020',
            opacity: flashOpacity,
            pointerEvents: 'none',
          }}
        />

        {/* radial vignette */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,${vignettePulse}) 80%)`,
            pointerEvents: 'none',
          }}
        />

        {/* main content */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
          }}
        >
          {/* THE OLD WAY title */}
          <div
            style={{
              fontSize: 18,
              fontFamily: mono,
              fontWeight: 700,
              letterSpacing: '0.3em',
              color: 'rgba(255,60,60,0.5)',
              marginBottom: 20,
              opacity: titleOpacity,
              transform: `translate(${titleShakeX}px, ${titleShakeY}px)`,
            }}
          >
            THE OLD WAY
          </div>

          {/* big X / lock icon area */}
          <div
            style={{
              opacity: titleOpacity,
              transform: `scale(${titleScale}) translate(${titleShakeX}px, ${titleShakeY}px)`,
              marginBottom: 48,
            }}
          >
            <div
              style={{
                width: 120,
                height: 120,
                borderRadius: 28,
                border: '4px solid rgba(255,40,40,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(255,30,30,0.06)',
                position: 'relative',
              }}
            >
              {/* lock body */}
              <div
                style={{
                  width: 44,
                  height: 36,
                  borderRadius: 6,
                  backgroundColor: 'rgba(255,50,50,0.6)',
                  position: 'relative',
                }}
              >
                {/* keyhole */}
                <div
                  style={{
                    position: 'absolute',
                    top: 10,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 10,
                    height: 10,
                    borderRadius: 5,
                    backgroundColor: '#0A0A0A',
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: 18,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 4,
                    height: 10,
                    borderRadius: 2,
                    backgroundColor: '#0A0A0A',
                  }}
                />
              </div>
              {/* lock shackle */}
              <div
                style={{
                  position: 'absolute',
                  top: 18,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 36,
                  height: 26,
                  borderRadius: '18px 18px 0 0',
                  border: '5px solid rgba(255,50,50,0.6)',
                  borderBottom: 'none',
                }}
              />
            </div>
          </div>

          {/* lines */}
          {lines.map((line, i) => {
            const delay = lineDelays[i]
            const lineSpring = spring({
              frame: Math.max(0, frame - delay),
              fps,
              config: { damping: 16, stiffness: 120 },
            })
            const slideY = interpolate(lineSpring, [0, 1], [40, 0])
            const lineOpacity = interpolate(lineSpring, [0, 0.3], [0, 1], {
              extrapolateRight: 'clamp',
            })

            // strikethrough that draws across after text appears
            const strikeProgress = interpolate(
              frame,
              [delay + 18, delay + 32],
              [0, 1],
              {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.out(Easing.cubic),
              }
            )

            return (
              <div
                key={i}
                style={{
                  opacity: lineOpacity,
                  transform: `translateY(${slideY}px)`,
                  marginBottom: i < lines.length - 1 ? 16 : 0,
                  position: 'relative',
                  display: 'inline-block',
                }}
              >
                <span
                  style={{
                    fontSize: 52,
                    fontWeight: 900,
                    color: i === 2 ? '#FF3C3C' : 'rgba(255,255,255,0.85)',
                    fontFamily: inter,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.3,
                  }}
                >
                  {line}
                </span>
                {/* red strikethrough */}
                <div
                  style={{
                    position: 'absolute',
                    top: '52%',
                    left: -4,
                    height: 4,
                    width: `${strikeProgress * 105}%`,
                    backgroundColor: 'rgba(255,50,50,0.4)',
                    borderRadius: 2,
                    transform: 'translateY(-50%)',
                  }}
                />
              </div>
            )
          })}
        </div>

        {/* scattered :( faces */}
        {sadFaces.map((face, i) => {
          const faceSpring = spring({
            frame: Math.max(0, frame - face.delay),
            fps,
            config: { damping: 12, stiffness: 140 },
          })
          const faceOpacity = interpolate(faceSpring, [0, 0.4], [0, 1], {
            extrapolateRight: 'clamp',
          })
          const faceScale = interpolate(faceSpring, [0, 1], [0.3, 1])
          // gentle float
          const floatY = Math.sin((frame + i * 40) * 0.05) * 6
          const floatRot = face.rot + Math.sin((frame + i * 30) * 0.04) * 3

          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: face.x,
                top: face.y,
                fontSize: face.size,
                opacity: faceOpacity * 0.5,
                transform: `scale(${faceScale}) translateY(${floatY}px) rotate(${floatRot}deg)`,
                color: 'rgba(255,60,60,0.6)',
                fontFamily: inter,
                fontWeight: 400,
                userSelect: 'none',
              }}
            >
              :(
            </div>
          )
        })}

        {/* bottom text */}
        <div
          style={{
            position: 'absolute',
            bottom: 48,
            width: '100%',
            textAlign: 'center',
            opacity: interpolate(frame, [100, 118], [0, 0.4], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            fontSize: 15,
            fontFamily: mono,
            fontWeight: 400,
            letterSpacing: '0.2em',
            color: 'rgba(255,60,60,0.5)',
          }}
        >
          THIS IS HOW IT'S BEEN
        </div>
      </div>

      {/* end darkening overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: 'black',
          opacity: endDarken,
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
