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
  target: number
  rangeMin?: number
  rangeMax?: number
  result: number
  win: boolean
  bet: number
  winChance: number
  payout: number
}

const rounds: Round[] = [
  { mode: 'OVER', target: 60, result: 73, win: true, bet: 100, winChance: 40, payout: 2.45 },
  { mode: 'UNDER', target: 35, result: 52, win: false, bet: 50, winChance: 35, payout: 2.8 },
  { mode: 'RANGE', target: 0, rangeMin: 25, rangeMax: 75, result: 41, win: true, bet: 100, winChance: 50, payout: 1.96 },
  { mode: 'OVER', target: 50, result: 23, win: false, bet: 500, winChance: 50, payout: 1.96 },
  { mode: 'UNDER', target: 80, result: 67, win: true, bet: 10, winChance: 80, payout: 1.22 },
]

const gasCosts = ['$2.14', '$1.87', '$2.43', '$1.92', '$2.31']

// right side timing (house protocol, instant)
const HP_ROLL = 18
const HP_FPR = 46

// left side timing (common, has tx modal delay, painfully slow)
const CM_MODAL = 83
const CM_ROLL = 18
const CM_FPR = 115

const ENTRY_DELAY = 8
const CARD_W = 360
const SLIDER_W = 300

interface Theme {
  cardBg: string
  cardBorder: string
  cardShadow: string
  text: string
  textSub: string
  winColor: string
  loseColor: string
  statsBg: string
  activeBg: string
  activeText: string
  inactiveBg: string
  inactiveBorder: string
  inactiveText: string
  rollBtnBg: string
  rollBtnText: string
  rollBtnShadow: string
  sliderBg: string
  numBoxBorder: string
  numBoxShadow: string
}

const dark: Theme = {
  cardBg: '#18181b',
  cardBorder: '#2a2a2e',
  cardShadow: '6px 6px 0px rgba(74,222,128,0.2)',
  text: '#e5e5e5',
  textSub: 'rgba(255,255,255,0.3)',
  winColor: '#4ade80',
  loseColor: '#ef4444',
  statsBg: '#222225',
  activeBg: '#4ade80',
  activeText: '#000',
  inactiveBg: '#27272a',
  inactiveBorder: '#3f3f46',
  inactiveText: '#71717a',
  rollBtnBg: '#4ade80',
  rollBtnText: '#000',
  rollBtnShadow: '4px 4px 0px rgba(74,222,128,0.25)',
  sliderBg: '#333',
  numBoxBorder: '#3f3f46',
  numBoxShadow: '4px 4px 0px rgba(74,222,128,0.15)',
}

const light: Theme = {
  cardBg: 'white',
  cardBorder: 'black',
  cardShadow: '8px 8px 0px black',
  text: 'black',
  textSub: 'rgba(0,0,0,0.4)',
  winColor: '#CDFF57',
  loseColor: '#FF6B9D',
  statsBg: '#f5f5f5',
  activeBg: 'black',
  activeText: 'white',
  inactiveBg: 'white',
  inactiveBorder: 'black',
  inactiveText: 'black',
  rollBtnBg: 'black',
  rollBtnText: 'white',
  rollBtnShadow: '4px 4px 0px rgba(205,255,87,0.6)',
  sliderBg: '#e5e5e5',
  numBoxBorder: 'black',
  numBoxShadow: '5px 5px 0px black',
}

// reusable card renderer
function renderGameCard(p: {
  round: Round
  displayNum: number
  isRolling: boolean
  rollDone: boolean
  resultScale: number
  dotProgress: number
  shakeX: number
  shakeY: number
  t: Theme
}) {
  const { round, displayNum, isRolling, rollDone, resultScale, dotProgress, shakeX, shakeY, t } = p

  const boxColor = rollDone
    ? round.win ? t.winColor : t.loseColor
    : t.loseColor
  const numColor = t === light
    ? 'black'
    : (rollDone && round.win ? '#000' : '#fff')

  const resultText = rollDone ? (round.win ? 'HIT' : 'MISS') : ''
  const resultColor = round.win ? t.winColor : t.loseColor

  const modeLabel = round.mode === 'OVER'
    ? `Roll > ${round.target}`
    : round.mode === 'UNDER'
      ? `Roll < ${round.target}`
      : `Roll ${round.rangeMin} - ${round.rangeMax}`

  const dotX = rollDone ? (round.result / 100) * SLIDER_W : -20

  return (
    <div
      style={{
        backgroundColor: t.cardBg,
        border: `3px solid ${t.cardBorder}`,
        borderRadius: 24,
        width: CARD_W,
        boxShadow: t.cardShadow,
        padding: '28px 26px 26px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* number box */}
      <div
        style={{
          width: 110,
          height: 110,
          borderRadius: 20,
          backgroundColor: boxColor,
          border: `3px solid ${t.numBoxBorder}`,
          boxShadow: t.numBoxShadow,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `translate(${shakeX}px, ${shakeY}px)`,
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 48, fontWeight: 900, color: numColor, fontFamily: inter, letterSpacing: '-0.02em' }}>
          {displayNum}
        </span>
      </div>

      {/* HIT / MISS */}
      <div style={{ height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        {resultText && (
          <span style={{
            fontSize: 18, fontWeight: 900, color: resultColor, fontFamily: inter,
            letterSpacing: '0.1em', transform: `scale(${resultScale})`,
          }}>
            {resultText}
          </span>
        )}
      </div>

      {/* slider */}
      <div style={{ width: SLIDER_W, marginBottom: 4, position: 'relative' }}>
        <div style={{
          width: '100%', height: 12, borderRadius: 6,
          backgroundColor: t.sliderBg, position: 'relative', overflow: 'hidden',
        }}>
          {round.mode === 'OVER' && (
            <>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: (round.target / 100) * SLIDER_W,
                backgroundColor: t.loseColor, borderRadius: '6px 0 0 6px',
              }} />
              <div style={{
                position: 'absolute', left: (round.target / 100) * SLIDER_W,
                top: 0, bottom: 0, right: 0,
                backgroundColor: t.winColor, borderRadius: '0 6px 6px 0',
              }} />
            </>
          )}
          {round.mode === 'UNDER' && (
            <>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: (round.target / 100) * SLIDER_W,
                backgroundColor: t.winColor, borderRadius: '6px 0 0 6px',
              }} />
              <div style={{
                position: 'absolute', left: (round.target / 100) * SLIDER_W,
                top: 0, bottom: 0, right: 0,
                backgroundColor: t.loseColor, borderRadius: '0 6px 6px 0',
              }} />
            </>
          )}
          {round.mode === 'RANGE' && (
            <>
              <div style={{
                position: 'absolute', left: 0, top: 0, bottom: 0,
                width: ((round.rangeMin || 0) / 100) * SLIDER_W,
                backgroundColor: t.loseColor, borderRadius: '6px 0 0 6px',
              }} />
              <div style={{
                position: 'absolute', left: ((round.rangeMin || 0) / 100) * SLIDER_W,
                top: 0, bottom: 0,
                width: (((round.rangeMax || 100) - (round.rangeMin || 0)) / 100) * SLIDER_W,
                backgroundColor: t.winColor,
              }} />
              <div style={{
                position: 'absolute', left: ((round.rangeMax || 100) / 100) * SLIDER_W,
                top: 0, bottom: 0, right: 0,
                backgroundColor: t.loseColor, borderRadius: '0 6px 6px 0',
              }} />
            </>
          )}
          {round.mode !== 'RANGE' && (
            <div style={{
              position: 'absolute', left: (round.target / 100) * SLIDER_W - 2,
              top: -1, bottom: -1, width: 4,
              backgroundColor: t === light ? 'white' : '#666', borderRadius: 2,
            }} />
          )}
        </div>

        {/* result dot */}
        {rollDone && (
          <div style={{
            position: 'absolute', top: -2,
            left: dotX * dotProgress - 8, width: 16, height: 16,
            borderRadius: 8, backgroundColor: t === light ? 'black' : '#e5e5e5',
            border: `2px solid ${t === light ? 'white' : '#444'}`,
            boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
          }} />
        )}

        {/* scale labels */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: 5,
          fontSize: 10, fontFamily: mono, color: t.textSub,
        }}>
          <span>0</span><span>25</span><span>50</span><span>75</span><span>100</span>
        </div>
      </div>

      {/* mode label */}
      <div style={{ fontSize: 12, fontFamily: mono, color: t.textSub, marginBottom: 14 }}>
        {modeLabel}
      </div>

      {/* mode buttons */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, width: '100%' }}>
        {(['OVER', 'UNDER', 'RANGE'] as GameMode[]).map((m) => (
          <div key={m} style={{
            flex: 1, height: 36, borderRadius: 18,
            border: `2px solid ${round.mode === m ? t.cardBorder : t.inactiveBorder}`,
            backgroundColor: round.mode === m ? t.activeBg : t.inactiveBg,
            color: round.mode === m ? t.activeText : t.inactiveText,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700, fontFamily: inter, letterSpacing: '0.05em',
          }}>
            {m}
          </div>
        ))}
      </div>

      {/* stats row */}
      <div style={{
        width: '100%', backgroundColor: t.statsBg, borderRadius: 12,
        padding: '12px 16px', display: 'flex', justifyContent: 'space-between', marginBottom: 12,
      }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: mono, color: t.textSub, letterSpacing: '0.1em', marginBottom: 3 }}>
            WIN CHANCE
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: t.text, fontFamily: inter }}>
            {round.winChance.toFixed(1)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: 9, fontFamily: mono, color: t.textSub, letterSpacing: '0.1em', marginBottom: 3 }}>
            PAYOUT
          </div>
          <div style={{ fontSize: 20, fontWeight: 900, color: t.text, fontFamily: inter }}>
            {round.payout.toFixed(2)}x
          </div>
        </div>
      </div>

      {/* bet amounts */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 12, width: '100%' }}>
        {[10, 50, 100, 500].map((amt) => (
          <div key={amt} style={{
            flex: 1, height: 34, borderRadius: 17,
            border: `2px solid ${round.bet === amt ? t.cardBorder : t.inactiveBorder}`,
            backgroundColor: round.bet === amt ? t.activeBg : t.inactiveBg,
            color: round.bet === amt ? t.activeText : t.inactiveText,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, fontFamily: inter,
          }}>
            ${amt}
          </div>
        ))}
      </div>

      {/* roll button */}
      <div style={{
        width: '100%', height: 44, borderRadius: 22,
        backgroundColor: t.rollBtnBg, border: `2px solid ${t.cardBorder}`,
        boxShadow: t.rollBtnShadow,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: t.rollBtnText, fontSize: 14, fontWeight: 900, fontFamily: inter,
        letterSpacing: '0.08em',
      }}>
        ROLL AGAIN
      </div>
    </div>
  )
}

export const RangeGame = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // entrance
  const entrance = spring({ frame, fps, config: { damping: 14, stiffness: 80 } })
  const cardScale = interpolate(entrance, [0, 1], [0.85, 1])
  const cardOpacity = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // floating
  const floatY = Math.sin(frame * 0.06) * 6
  const floatX = Math.cos(frame * 0.04) * 4
  const floatRot = Math.sin(frame * 0.035) * 1

  // label entrance
  const labelOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const labelSlideL = interpolate(frame, [0, 12], [-20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
  const labelSlideR = interpolate(frame, [0, 12], [20, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })

  // bg drift
  const bgX = frame * 0.5
  const bgY = frame * 0.25

  // ===== RIGHT SIDE (House Protocol) =====
  const hpElapsed = Math.max(0, frame - ENTRY_DELAY)
  const hpRoundIdx = Math.min(4, Math.floor(hpElapsed / HP_FPR))
  const hpRoundFrame = hpElapsed - hpRoundIdx * HP_FPR
  const hpRound = rounds[hpRoundIdx]
  const hpBetsCompleted = hpRoundFrame >= HP_ROLL ? hpRoundIdx + 1 : hpRoundIdx

  const hpRand = seededRandom(frame * 7 + hpRoundIdx * 1337)
  const hpIsRolling = hpRoundFrame >= 0 && hpRoundFrame < HP_ROLL
  const hpRollDone = hpRoundFrame >= HP_ROLL

  let hpDisplayNum = hpRound.result
  if (hpIsRolling) {
    const p = hpRoundFrame / HP_ROLL
    if (p < 0.7) {
      hpDisplayNum = Math.floor(hpRand() * 100)
    } else {
      const c = interpolate(p, [0.7, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      const noise = Math.floor((1 - c) * (hpRand() * 30 - 15))
      hpDisplayNum = Math.max(0, Math.min(99, hpRound.result + noise))
    }
  }

  const hpResultScale = hpRollDone
    ? spring({ frame: Math.max(0, hpRoundFrame - HP_ROLL), fps, config: { damping: 10, stiffness: 200 } })
    : 0
  const hpDotProgress = hpRollDone
    ? interpolate(hpRoundFrame - HP_ROLL, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
    : 0
  const hpResultPulse = hpRollDone
    ? interpolate(Math.sin((hpRoundFrame - HP_ROLL) * 0.3), [-1, 1], [0.99, 1.01])
    : 1
  const hpShakeX = hpIsRolling ? Math.sin(frame * 1.2) * 2 : 0
  const hpShakeY = hpIsRolling ? Math.cos(frame * 1.5) * 1.5 : 0

  // right side win/lose popup
  const POPUP_DUR = 10
  const hpPopupFrame = hpRoundFrame - HP_ROLL
  const hpShowPopup = hpRollDone && hpPopupFrame >= 0 && hpPopupFrame < POPUP_DUR
  const hpPopupOpacity = hpShowPopup
    ? interpolate(hpPopupFrame, [0, 1, 6, POPUP_DUR], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0
  const hpPopupScale = hpShowPopup
    ? interpolate(hpPopupFrame, [0, 3], [1.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
    : 0

  // ===== LEFT SIDE (Common) =====
  const cmElapsed = Math.max(0, frame - ENTRY_DELAY)
  const cmRoundIdx = Math.min(4, Math.floor(cmElapsed / CM_FPR))
  const cmRoundFrame = cmElapsed - cmRoundIdx * CM_FPR
  const cmRound = rounds[cmRoundIdx]

  const cmInModal = cmRoundFrame < CM_MODAL
  const cmIsRolling = cmRoundFrame >= CM_MODAL && cmRoundFrame < CM_MODAL + CM_ROLL
  const cmRollDone = cmRoundFrame >= CM_MODAL + CM_ROLL
  const cmBetsCompleted = cmRollDone ? cmRoundIdx + 1 : cmRoundIdx

  // modal animation
  const modalOpacity = cmInModal
    ? interpolate(cmRoundFrame, [0, 3, CM_MODAL - 3, CM_MODAL], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0
  const modalScale = cmInModal
    ? interpolate(cmRoundFrame, [0, 5], [0.9, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
    : 1
  const modalPhase = cmRoundFrame < 33 ? 0 : cmRoundFrame < 66 ? 1 : 2

  // left side roll computation
  const cmRollFrame = cmRoundFrame - CM_MODAL
  const cmRand = seededRandom(frame * 13 + cmRoundIdx * 997)

  let cmDisplayNum = cmRound.result
  if (cmIsRolling) {
    const p = cmRollFrame / CM_ROLL
    if (p < 0.7) {
      cmDisplayNum = Math.floor(cmRand() * 100)
    } else {
      const c = interpolate(p, [0.7, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
      const noise = Math.floor((1 - c) * (cmRand() * 30 - 15))
      cmDisplayNum = Math.max(0, Math.min(99, cmRound.result + noise))
    }
  }

  const cmResultScale = cmRollDone
    ? spring({ frame: Math.max(0, cmRoundFrame - CM_MODAL - CM_ROLL), fps, config: { damping: 10, stiffness: 200 } })
    : 0
  const cmDotProgress = cmRollDone
    ? interpolate(cmRoundFrame - CM_MODAL - CM_ROLL, [0, 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
    : 0
  const cmResultPulse = cmRollDone
    ? interpolate(Math.sin((cmRoundFrame - CM_MODAL - CM_ROLL) * 0.3), [-1, 1], [0.99, 1.01])
    : 1
  const cmShakeX = cmIsRolling ? Math.sin(frame * 1.2) * 2 : 0
  const cmShakeY = cmIsRolling ? Math.cos(frame * 1.5) * 1.5 : 0

  // left side win/lose popup
  const cmPopupFrame = cmRoundFrame - (CM_MODAL + CM_ROLL)
  const cmShowPopup = cmRollDone && cmPopupFrame >= 0 && cmPopupFrame < POPUP_DUR
  const cmPopupOpacity = cmShowPopup
    ? interpolate(cmPopupFrame, [0, 1, 6, POPUP_DUR], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
    : 0
  const cmPopupScale = cmShowPopup
    ? interpolate(cmPopupFrame, [0, 3], [1.8, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })
    : 0

  // popup helper
  const renderPopup = (round: Round, opacity: number, scale: number, t: Theme) => {
    if (opacity <= 0) return null
    const amount = round.win
      ? `+$${Math.floor(round.bet * round.payout)}`
      : `-$${round.bet}`
    const bgColor = round.win ? t.winColor : t.loseColor
    const textColor = t === light ? 'black' : (round.win ? '#000' : '#fff')
    return (
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, -50%) scale(${scale})`,
        opacity, zIndex: 20,
      }}>
        <div style={{
          backgroundColor: bgColor, borderRadius: 32,
          padding: '32px 64px',
          boxShadow: '0 16px 60px rgba(0,0,0,0.4)',
          border: `4px solid ${t === light ? 'black' : 'rgba(255,255,255,0.15)'}`,
        }}>
          <span style={{
            fontSize: 80, fontWeight: 900, color: textColor,
            fontFamily: inter, letterSpacing: '-0.03em', whiteSpace: 'nowrap',
          }}>
            {amount}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', fontFamily: inter }}>

      {/* ===== LEFT PANEL (Common) ===== */}
      <div style={{ width: '50%', height: '100%', position: 'relative', backgroundColor: '#0a0a0c' }}>
        {/* dark dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          backgroundPosition: `${bgX}px ${bgY}px`,
        }} />

        {/* label */}
        <div style={{
          position: 'absolute', top: 40, left: 40, zIndex: 5,
          opacity: labelOpacity, transform: `translateX(${labelSlideL}px)`,
          display: 'flex', flexDirection: 'column', gap: 10,
        }}>
          <div style={{
            backgroundColor: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 16, padding: '14px 28px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: '#a1a1aa', fontFamily: inter, letterSpacing: '0.06em' }}>
              Common
            </span>
            <span style={{ fontSize: 15, fontFamily: mono, color: '#52525b' }}>
              Bet #{cmRoundIdx + 1}
            </span>
          </div>
          {/* progress dots */}
          <div style={{ display: 'flex', gap: 7, paddingLeft: 6 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: i < cmBetsCompleted ? '#4ade80' : '#27272a',
                transition: 'background-color 0.2s',
              }} />
            ))}
          </div>
        </div>

        {/* card + modal */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%', position: 'relative',
        }}>
          <div style={{
            opacity: cardOpacity,
            transform: `scale(${cardScale * cmResultPulse}) translate(${floatX}px, ${floatY}px) rotate(${floatRot}deg)`,
            position: 'relative',
          }}>
            {renderGameCard({
              round: cmRound,
              displayNum: cmDisplayNum,
              isRolling: cmIsRolling,
              rollDone: cmRollDone,
              resultScale: cmResultScale,
              dotProgress: cmDotProgress,
              shakeX: cmShakeX,
              shakeY: cmShakeY,
              t: dark,
            })}

            {/* win/lose popup */}
            {renderPopup(cmRound, cmPopupOpacity, cmPopupScale, dark)}

            {/* tx confirmation modal overlay */}
            {cmInModal && (
              <div style={{
                position: 'absolute', inset: -6, borderRadius: 28,
                backgroundColor: `rgba(0,0,0,${modalOpacity * 0.75})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 10,
              }}>
                <div style={{
                  opacity: modalOpacity,
                  transform: `scale(${modalScale})`,
                  backgroundColor: '#1e1e22',
                  border: '2px solid #444',
                  borderRadius: 28,
                  padding: '44px 56px',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22,
                  boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
                }}>
                  {modalPhase < 2 ? (
                    <div style={{
                      width: 56, height: 56,
                      border: '4px solid rgba(74,222,128,0.15)',
                      borderTopColor: '#4ade80',
                      borderRadius: '50%',
                      transform: `rotate(${frame * 12}deg)`,
                    }} />
                  ) : (
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%',
                      backgroundColor: '#4ade80',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 28, color: 'black', fontWeight: 900,
                    }}>
                      {'✓'}
                    </div>
                  )}
                  <span style={{
                    color: 'white', fontSize: 22, fontWeight: 700,
                    fontFamily: inter, letterSpacing: '0.02em', whiteSpace: 'nowrap',
                  }}>
                    {modalPhase === 0
                      ? 'Broadcasting Transaction...'
                      : modalPhase === 1
                        ? 'Waiting for Confirmation...'
                        : 'Transaction Confirmed!'}
                  </span>
                  {modalPhase < 2 && (
                    <span style={{ color: '#52525b', fontSize: 14, fontFamily: mono }}>
                      Est. gas: {gasCosts[cmRoundIdx]}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== DIVIDER ===== */}
      <div style={{
        width: 2, height: '100%',
        background: 'linear-gradient(to bottom, transparent 5%, rgba(255,255,255,0.08) 30%, rgba(255,255,255,0.12) 50%, rgba(255,255,255,0.08) 70%, transparent 95%)',
      }} />

      {/* ===== RIGHT PANEL (House Protocol) ===== */}
      <div style={{ width: '50%', height: '100%', position: 'relative', backgroundColor: '#CDFF57' }}>
        {/* light dot grid */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle, rgba(0,0,0,0.06) 1.2px, transparent 1.2px)',
          backgroundSize: '28px 28px',
          backgroundPosition: `${bgX}px ${bgY}px`,
        }} />

        {/* label */}
        <div style={{
          position: 'absolute', top: 40, right: 40, zIndex: 5,
          opacity: labelOpacity, transform: `translateX(${labelSlideR}px)`,
          display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10,
        }}>
          <div style={{
            backgroundColor: 'rgba(0,0,0,0.08)', border: '2px solid rgba(0,0,0,0.12)',
            borderRadius: 16, padding: '14px 28px',
            display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <span style={{ fontSize: 24, fontWeight: 900, color: 'black', fontFamily: inter, letterSpacing: '0.06em' }}>
              House Protocol
            </span>
            <span style={{ fontSize: 15, fontFamily: mono, color: 'rgba(0,0,0,0.5)' }}>
              Bet #{hpRoundIdx + 1}
            </span>
          </div>
          {/* progress dots */}
          <div style={{ display: 'flex', gap: 7, paddingRight: 6 }}>
            {[0, 1, 2, 3, 4].map(i => (
              <div key={i} style={{
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: i < hpBetsCompleted ? 'black' : 'rgba(0,0,0,0.12)',
              }} />
            ))}
          </div>
        </div>

        {/* card */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: '100%', height: '100%',
        }}>
          <div style={{
            opacity: cardOpacity,
            transform: `scale(${cardScale * hpResultPulse}) translate(${floatX}px, ${floatY}px) rotate(${floatRot}deg)`,
            position: 'relative',
          }}>
            {renderGameCard({
              round: hpRound,
              displayNum: hpDisplayNum,
              isRolling: hpIsRolling,
              rollDone: hpRollDone,
              resultScale: hpResultScale,
              dotProgress: hpDotProgress,
              shakeX: hpShakeX,
              shakeY: hpShakeY,
              t: light,
            })}

            {/* win/lose popup */}
            {renderPopup(hpRound, hpPopupOpacity, hpPopupScale, light)}
          </div>
        </div>

        {/* powered by badge */}
        <div style={{
          position: 'absolute', bottom: 36, right: 36, zIndex: 5,
          opacity: interpolate(frame, [12, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
          backgroundColor: 'white', border: '3px solid black',
          borderRadius: 22, padding: '20px 28px',
          boxShadow: '5px 5px 0px black',
        }}>
          <span style={{
            fontSize: 14, fontFamily: mono, opacity: 0.6,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: 'black',
          }}>
            Powered by
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Img src={staticFile('erc7824.png')} style={{ height: 50, width: 'auto' }} />
            <div style={{ width: 1, height: 32, backgroundColor: 'rgba(0,0,0,0.2)' }} />
            <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.7, color: 'black', fontFamily: inter }}>
              Gasless & Instant
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
