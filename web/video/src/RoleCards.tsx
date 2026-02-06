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

const roles = [
  {
    title: 'STAKERS',
    tagline: 'be the house',
    desc: 'Deposit USDC/ETH, earn yield from every bet placed on the protocol',
    num: '01',
    color: '#CDFF57',
    cta: "Let's Earn →",
  },
  {
    title: 'PLAYERS',
    tagline: 'beat the house',
    desc: 'Play gasless with instant settlement via state channels',
    num: '02',
    color: '#FF6B9D',
    cta: "Let's get rekt →",
  },
  {
    title: 'BUILDERS',
    tagline: 'become the house',
    desc: 'Deploy games with no code, earn 25% of house edge',
    num: '03',
    color: '#FFFFFF',
    cta: "Let's Buidl! →",
  },
]

// layout
const CARD_W = 500
const CARD_H = 300
const GAP = 28
const ROW_W = CARD_W * 3 + GAP * 2
const ROW_LEFT = (1920 - ROW_W) / 2
const CARDS_TOP = 410
const ZOOM = 2.5

// card left edges
const CARD_LEFTS = [
  ROW_LEFT,
  ROW_LEFT + CARD_W + GAP,
  ROW_LEFT + (CARD_W + GAP) * 2,
]

// to center a card on screen at ZOOM:
// origin = (ZOOM * cardCenter - screenCenter) / (ZOOM - 1)
function calcOrigin(cardCenter: number, screenCenter: number) {
  return (ZOOM * cardCenter - screenCenter) / (ZOOM - 1)
}

const CARD_CENTER_X = CARD_LEFTS.map((l) => l + CARD_W / 2)
const CARD_CENTER_Y = CARDS_TOP + CARD_H / 2

const ORIGIN_X = CARD_CENTER_X.map((cx) => calcOrigin(cx, 960))
const ORIGIN_Y = calcOrigin(CARD_CENTER_Y, 540)

// timeline (30fps)
// 0-55: entrance
// 55-80: zoom in to card 1
// 80-110: hold card 1 (1s)
// 110-135: pan to card 2
// 135-165: hold card 2 (1s)
// 165-190: pan to card 3
// 190-220: hold card 3 (1s)
// 220-255: zoom out
// 255-270: final hold

export const RoleCards = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // label fade
  const labelOpacity = interpolate(frame, [5, 25], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // card entrance springs (staggered)
  const cardSprings = [0, 1, 2].map((i) => {
    const delay = 12 + i * 10
    return spring({
      frame: Math.max(0, frame - delay),
      fps,
      config: { damping: 14, stiffness: 100 },
    })
  })

  // eased helper
  const ease = (
    f: number,
    from: number,
    to: number,
    easing: (t: number) => number,
  ) =>
    interpolate(f, [from, to], [0, 1], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing,
    })

  // zoom
  let zoom = 1
  if (frame <= 55) {
    zoom = 1
  } else if (frame <= 80) {
    zoom = interpolate(
      ease(frame, 55, 80, Easing.out(Easing.cubic)),
      [0, 1],
      [1, ZOOM],
    )
  } else if (frame <= 220) {
    zoom = ZOOM
  } else if (frame <= 255) {
    zoom = interpolate(
      ease(frame, 220, 255, Easing.inOut(Easing.quad)),
      [0, 1],
      [ZOOM, 1],
    )
  }

  // origin X
  let originX = 960
  if (frame <= 55) {
    originX = 960
  } else if (frame <= 80) {
    const t = ease(frame, 55, 80, Easing.out(Easing.cubic))
    originX = interpolate(t, [0, 1], [960, ORIGIN_X[0]])
  } else if (frame <= 110) {
    originX = ORIGIN_X[0]
  } else if (frame <= 135) {
    const t = ease(frame, 110, 135, Easing.inOut(Easing.cubic))
    originX = interpolate(t, [0, 1], [ORIGIN_X[0], ORIGIN_X[1]])
  } else if (frame <= 165) {
    originX = ORIGIN_X[1]
  } else if (frame <= 190) {
    const t = ease(frame, 165, 190, Easing.inOut(Easing.cubic))
    originX = interpolate(t, [0, 1], [ORIGIN_X[1], ORIGIN_X[2]])
  } else if (frame <= 220) {
    originX = ORIGIN_X[2]
  } else if (frame <= 255) {
    const t = ease(frame, 220, 255, Easing.inOut(Easing.quad))
    originX = interpolate(t, [0, 1], [ORIGIN_X[2], 960])
  }

  // origin Y
  let originY = 540
  if (frame > 55 && frame <= 80) {
    const t = ease(frame, 55, 80, Easing.out(Easing.cubic))
    originY = interpolate(t, [0, 1], [540, ORIGIN_Y])
  } else if (frame > 80 && frame <= 220) {
    originY = ORIGIN_Y
  } else if (frame > 220 && frame <= 255) {
    const t = ease(frame, 220, 255, Easing.inOut(Easing.quad))
    originY = interpolate(t, [0, 1], [ORIGIN_Y, 540])
  }

  // brand watermark
  const brandOpacity = interpolate(frame, [245, 265], [0, 0.3], {
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
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          backgroundColor: '#1A1A1A',
          fontFamily: inter,
          position: 'relative',
          transform: `scale(${zoom})`,
          transformOrigin: `${originX}px ${originY}px`,
        }}
      >
        {/* polkadot bg */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, #CDFF57 3px, transparent 3px), radial-gradient(circle, #FF6B9D 3px, transparent 3px)',
            backgroundSize: '32px 32px',
            backgroundPosition: '0 0, 16px 16px',
            opacity: 0.15,
          }}
        />

        {/* choose your path label */}
        <div
          style={{
            position: 'absolute',
            top: CARDS_TOP - 48,
            left: ROW_LEFT,
            opacity: labelOpacity,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <span
            style={{
              fontSize: 13,
              fontFamily: mono,
              color: 'rgba(255,255,255,0.45)',
              letterSpacing: '0.15em',
              fontWeight: 400,
            }}
          >
            CHOOSE YOUR PATH
          </span>
          <div
            style={{
              width: 200,
              height: 1,
              backgroundColor: 'rgba(255,255,255,0.15)',
            }}
          />
        </div>

        {/* cards */}
        {roles.map((role, i) => {
          const s = cardSprings[i]
          const slideY = interpolate(s, [0, 1], [60, 0])
          const opacity = interpolate(s, [0, 0.3], [0, 1], {
            extrapolateRight: 'clamp',
          })

          return (
            <div
              key={role.title}
              style={{
                position: 'absolute',
                top: CARDS_TOP,
                left: CARD_LEFTS[i],
                width: CARD_W,
                height: CARD_H,
                opacity,
                transform: `translateY(${slideY}px)`,
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: role.color,
                  border: '2px solid black',
                  borderRadius: 20,
                  padding: '32px 36px',
                  boxShadow: '6px 6px 0px black',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: 15,
                      fontFamily: mono,
                      opacity: 0.5,
                      color: 'black',
                    }}
                  >
                    {role.num}
                  </span>
                  <div
                    style={{
                      fontSize: 48,
                      fontWeight: 900,
                      letterSpacing: '-0.02em',
                      lineHeight: 1,
                      color: 'black',
                    }}
                  >
                    {role.title}
                  </div>
                  <div
                    style={{
                      fontSize: 17,
                      fontFamily: mono,
                      opacity: 0.6,
                      marginTop: 4,
                      color: 'black',
                    }}
                  >
                    {role.tagline}
                  </div>
                </div>

                <div style={{ flex: 1 }} />

                <div>
                  <div
                    style={{
                      fontSize: 17,
                      opacity: 0.75,
                      lineHeight: 1.5,
                      color: 'black',
                      marginBottom: 14,
                    }}
                  >
                    {role.desc}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 900,
                      fontFamily: mono,
                      color: 'black',
                      opacity: 0.5,
                      letterSpacing: '0.05em',
                    }}
                  >
                    {role.cta}
                  </span>
                </div>
              </div>
            </div>
          )
        })}

        {/* brand watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            width: '100%',
            textAlign: 'center',
            opacity: brandOpacity,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: '0.25em',
            color: 'white',
            fontFamily: inter,
          }}
        >
          HOUSE PROTOCOL
        </div>
      </div>
    </div>
  )
}
