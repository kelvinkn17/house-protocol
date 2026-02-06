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

// seeded random so it's deterministic
function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

type GameMode = 'OVER' | 'UNDER' | 'RANGE'

interface Round {
  mode: GameMode
  target: number // for OVER/UNDER
  rangeMin?: number // for RANGE mode
  rangeMax?: number
  result: number
  win: boolean
  bet: number
  winChance: number
  payout: number
}

// 5 pre-defined rounds, mixing modes and outcomes
const rounds: Round[] = [
  { mode: 'OVER', target: 60, result: 73, win: true, bet: 100, winChance: 40, payout: 2.45 },
  { mode: 'UNDER', target: 35, result: 52, win: false, bet: 50, winChance: 35, payout: 2.8 },
  { mode: 'RANGE', target: 0, rangeMin: 25, rangeMax: 75, result: 41, win: true, bet: 100, winChance: 50, payout: 1.96 },
  { mode: 'OVER', target: 50, result: 23, win: false, bet: 500, winChance: 50, payout: 1.96 },
  { mode: 'UNDER', target: 80, result: 67, win: true, bet: 10, winChance: 80, payout: 1.22 },
]

// frames per round, total ~240 frames = 8s at 30fps
const FRAMES_PER_ROUND = 46
// number rolling duration
const ROLL_FRAMES = 18
// result hold
const RESULT_HOLD = 16
// transition gap
const TRANSITION = 12

// card dimensions
const CARD_W = 440
const CARD_H = 680

export const RangeGame = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // entrance spring for the card
  const entrance = spring({ frame, fps, config: { damping: 14, stiffness: 80 } })
  const cardEntryScale = interpolate(entrance, [0, 1], [0.85, 1])
  const cardEntryOpacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // figure out which round we're on
  const roundIndex = Math.min(4, Math.floor(Math.max(0, frame - 8) / FRAMES_PER_ROUND))
  const roundFrame = Math.max(0, frame - 8) - roundIndex * FRAMES_PER_ROUND
  const round = rounds[roundIndex]

  // number rolling animation
  const rand = seededRandom(frame * 7 + roundIndex * 1337)
  const isRolling = roundFrame >= 0 && roundFrame < ROLL_FRAMES
  const rollDone = roundFrame >= ROLL_FRAMES
  const showResult = roundFrame >= ROLL_FRAMES && roundFrame < ROLL_FRAMES + RESULT_HOLD

  // the displayed number during rolling, then final
  let displayNumber = round.result
  if (isRolling) {
    // roll through random numbers, slowing down near the end
    const rollProgress = roundFrame / ROLL_FRAMES
    if (rollProgress < 0.7) {
      displayNumber = Math.floor(rand() * 100)
    } else {
      // slow down, converge toward result
      const converge = interpolate(rollProgress, [0.7, 1], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
      })
      const noise = Math.floor((1 - converge) * (rand() * 30 - 15))
      displayNumber = Math.max(0, Math.min(99, round.result + noise))
    }
  }

  // result text
  const resultText = rollDone ? (round.win ? 'HIT' : 'MISS') : ''
  const resultColor = round.win ? '#CDFF57' : '#FF6B9D'

  // result text bounce
  const resultScale = rollDone
    ? spring({
        frame: Math.max(0, roundFrame - ROLL_FRAMES),
        fps,
        config: { damping: 10, stiffness: 200 },
      })
    : 0

  // card floating motion (continuous)
  const floatY = Math.sin(frame * 0.06) * 8
  const floatX = Math.cos(frame * 0.04) * 5
  const floatRotate = Math.sin(frame * 0.035) * 1.5

  // subtle scale pulse on result
  const resultPulse = rollDone
    ? interpolate(
        Math.sin((roundFrame - ROLL_FRAMES) * 0.3),
        [-1, 1],
        [0.99, 1.01]
      )
    : 1

  // slider bar computation
  const sliderWidth = 360
  const getSliderColors = () => {
    if (round.mode === 'OVER') {
      const split = (round.target / 100) * sliderWidth
      return { redWidth: split, greenStart: split, greenWidth: sliderWidth - split }
    } else if (round.mode === 'UNDER') {
      const split = (round.target / 100) * sliderWidth
      return { redWidth: 0, greenStart: 0, greenWidth: split, redStart: split, redWidthEnd: sliderWidth - split }
    } else {
      // RANGE
      const minX = ((round.rangeMin || 0) / 100) * sliderWidth
      const maxX = ((round.rangeMax || 100) / 100) * sliderWidth
      return { rangeMin: minX, rangeMax: maxX }
    }
  }

  const sliderInfo = getSliderColors()

  // where the result dot lands on slider
  const dotX = rollDone ? (round.result / 100) * sliderWidth : -20

  // dot slide animation
  const dotSlideProgress = rollDone
    ? interpolate(roundFrame - ROLL_FRAMES, [0, 6], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
      })
    : 0

  // mode label text
  const getModeLabel = () => {
    if (round.mode === 'OVER') return `Roll > ${round.target}`
    if (round.mode === 'UNDER') return `Roll < ${round.target}`
    return `Roll ${round.rangeMin} - ${round.rangeMax}`
  }

  // background dot grid drift
  const bgX = frame * 0.5
  const bgY = frame * 0.25

  // brand watermark
  const brandOpacity = interpolate(frame, [20, 40], [0, 0.15], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // number box color: pink during roll, result-based after
  const boxColor = rollDone
    ? round.win
      ? '#CDFF57'
      : '#FF6B9D'
    : '#FF6B9D'

  // number box shake during roll
  const shakeX = isRolling ? Math.sin(frame * 1.2) * 2 : 0
  const shakeY = isRolling ? Math.cos(frame * 1.5) * 1.5 : 0

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
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#CDFF57',
          fontFamily: inter,
          position: 'relative',
        }}
      >
        {/* dot grid bg */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(0,0,0,0.06) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
            backgroundPosition: `${bgX}px ${bgY}px`,
          }}
        />

        {/* the game card */}
        <div
          style={{
            opacity: cardEntryOpacity,
            transform: `scale(${cardEntryScale * resultPulse}) translate(${floatX}px, ${floatY}px) rotate(${floatRotate}deg)`,
            backgroundColor: 'white',
            border: '3px solid black',
            borderRadius: 28,
            width: CARD_W,
            minHeight: CARD_H,
            boxShadow: '8px 8px 0px black',
            padding: '36px 32px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 0,
            position: 'relative',
          }}
        >
          {/* result number box */}
          <div
            style={{
              width: 130,
              height: 130,
              borderRadius: 22,
              backgroundColor: boxColor,
              border: '3px solid black',
              boxShadow: '5px 5px 0px black',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transform: `translate(${shakeX}px, ${shakeY}px)`,
              marginBottom: 8,
            }}
          >
            <span
              style={{
                fontSize: 56,
                fontWeight: 900,
                color: rollDone && round.win ? 'black' : 'white',
                fontFamily: inter,
                letterSpacing: '-0.02em',
              }}
            >
              {displayNumber}
            </span>
          </div>

          {/* HIT / MISS text */}
          <div
            style={{
              height: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 16,
            }}
          >
            {resultText && (
              <span
                style={{
                  fontSize: 22,
                  fontWeight: 900,
                  color: resultColor,
                  fontFamily: inter,
                  letterSpacing: '0.1em',
                  transform: `scale(${resultScale})`,
                  textShadow: round.win ? 'none' : 'none',
                }}
              >
                {resultText}
              </span>
            )}
          </div>

          {/* slider bar */}
          <div style={{ width: sliderWidth, marginBottom: 6, position: 'relative' }}>
            <div
              style={{
                width: '100%',
                height: 14,
                borderRadius: 7,
                backgroundColor: '#e5e5e5',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {round.mode === 'OVER' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: (round.target / 100) * sliderWidth,
                      backgroundColor: '#FF6B9D',
                      borderRadius: '7px 0 0 7px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: (round.target / 100) * sliderWidth,
                      top: 0,
                      bottom: 0,
                      right: 0,
                      backgroundColor: '#CDFF57',
                      borderRadius: '0 7px 7px 0',
                    }}
                  />
                </>
              )}
              {round.mode === 'UNDER' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: (round.target / 100) * sliderWidth,
                      backgroundColor: '#CDFF57',
                      borderRadius: '7px 0 0 7px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: (round.target / 100) * sliderWidth,
                      top: 0,
                      bottom: 0,
                      right: 0,
                      backgroundColor: '#FF6B9D',
                      borderRadius: '0 7px 7px 0',
                    }}
                  />
                </>
              )}
              {round.mode === 'RANGE' && (
                <>
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: ((round.rangeMin || 0) / 100) * sliderWidth,
                      backgroundColor: '#FF6B9D',
                      borderRadius: '7px 0 0 7px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: ((round.rangeMin || 0) / 100) * sliderWidth,
                      top: 0,
                      bottom: 0,
                      width: (((round.rangeMax || 100) - (round.rangeMin || 0)) / 100) * sliderWidth,
                      backgroundColor: '#CDFF57',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      left: ((round.rangeMax || 100) / 100) * sliderWidth,
                      top: 0,
                      bottom: 0,
                      right: 0,
                      backgroundColor: '#FF6B9D',
                      borderRadius: '0 7px 7px 0',
                    }}
                  />
                </>
              )}

              {/* target marker(s) */}
              {round.mode !== 'RANGE' && (
                <div
                  style={{
                    position: 'absolute',
                    left: (round.target / 100) * sliderWidth - 2,
                    top: -1,
                    bottom: -1,
                    width: 4,
                    backgroundColor: 'white',
                    borderRadius: 2,
                  }}
                />
              )}
            </div>

            {/* result dot on slider */}
            {rollDone && (
              <div
                style={{
                  position: 'absolute',
                  top: -2,
                  left: dotX * dotSlideProgress - 9,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  backgroundColor: 'black',
                  border: '2px solid white',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                }}
              />
            )}

            {/* scale labels */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontSize: 11,
                fontFamily: mono,
                color: 'rgba(0,0,0,0.35)',
              }}
            >
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>

          {/* mode label */}
          <div
            style={{
              fontSize: 14,
              fontFamily: mono,
              color: 'rgba(0,0,0,0.6)',
              marginBottom: 18,
              fontWeight: 400,
            }}
          >
            {getModeLabel()}
          </div>

          {/* mode buttons */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 18, width: '100%' }}>
            {(['OVER', 'UNDER', 'RANGE'] as GameMode[]).map((m) => (
              <div
                key={m}
                style={{
                  flex: 1,
                  height: 42,
                  borderRadius: 21,
                  border: '2px solid black',
                  backgroundColor: round.mode === m ? 'black' : 'white',
                  color: round.mode === m ? 'white' : 'black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: inter,
                  letterSpacing: '0.05em',
                }}
              >
                {m}
              </div>
            ))}
          </div>

          {/* stats row */}
          <div
            style={{
              width: '100%',
              backgroundColor: '#f5f5f5',
              borderRadius: 14,
              padding: '14px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: 16,
            }}
          >
            <div>
              <div style={{ fontSize: 10, fontFamily: mono, color: 'rgba(0,0,0,0.45)', letterSpacing: '0.1em', marginBottom: 4 }}>
                WIN CHANCE
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'black', fontFamily: inter }}>
                {round.winChance.toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: 10, fontFamily: mono, color: 'rgba(0,0,0,0.45)', letterSpacing: '0.1em', marginBottom: 4 }}>
                PAYOUT
              </div>
              <div style={{ fontSize: 24, fontWeight: 900, color: 'black', fontFamily: inter }}>
                {round.payout.toFixed(2)}x
              </div>
            </div>
          </div>

          {/* bet amount row */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, width: '100%' }}>
            {[10, 50, 100, 500].map((amt) => (
              <div
                key={amt}
                style={{
                  flex: 1,
                  height: 40,
                  borderRadius: 20,
                  border: '2px solid black',
                  backgroundColor: round.bet === amt ? 'black' : 'white',
                  color: round.bet === amt ? 'white' : 'black',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 700,
                  fontFamily: inter,
                }}
              >
                ${amt}
              </div>
            ))}
          </div>

          {/* roll button */}
          <div
            style={{
              width: '100%',
              height: 52,
              borderRadius: 26,
              backgroundColor: 'black',
              border: '2px solid black',
              boxShadow: '4px 4px 0px rgba(205,255,87,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 16,
              fontWeight: 900,
              fontFamily: inter,
              letterSpacing: '0.08em',
            }}
          >
            ROLL AGAIN
          </div>
        </div>

        {/* brand watermark */}
        <div
          style={{
            position: 'absolute',
            bottom: 36,
            opacity: brandOpacity,
            fontSize: 14,
            fontWeight: 900,
            letterSpacing: '0.25em',
            color: 'black',
            fontFamily: inter,
          }}
        >
          HOUSE PROTOCOL
        </div>

        {/* powered by badge, bottom right */}
        <div
          style={{
            position: 'absolute',
            bottom: 40,
            right: 48,
            opacity: interpolate(frame, [12, 30], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 8,
            backgroundColor: 'white',
            border: '3px solid black',
            borderRadius: 22,
            padding: '20px 28px',
            boxShadow: '5px 5px 0px black',
          }}
        >
          <span
            style={{
              fontSize: 14,
              fontFamily: mono,
              opacity: 0.6,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'black',
            }}
          >
            Powered by
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Img
              src={staticFile('erc7824.png')}
              style={{ height: 52, width: 'auto' }}
            />
            <div style={{ width: 1, height: 32, backgroundColor: 'rgba(0,0,0,0.25)' }} />
            <span
              style={{
                fontSize: 16,
                fontWeight: 700,
                opacity: 0.7,
                color: 'black',
                fontFamily: inter,
              }}
            >
              Gasless & Instant
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
