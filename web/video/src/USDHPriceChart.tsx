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

function seededRandom(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return s / 2147483647
  }
}

// bigger fluctuations, still trending $1.00 -> ~$1.50
function generatePriceData(numPoints: number): number[] {
  const rand = seededRandom(42)
  const data: number[] = []
  let noise = 0

  for (let i = 0; i < numPoints; i++) {
    const t = i / (numPoints - 1)
    const base = 1.0 + t * 0.5
    // bigger swings, slower mean revert
    noise += (rand() - 0.47) * 0.016
    noise *= 0.92
    data.push(base + noise)
  }

  return data
}

const PRICE_DATA = generatePriceData(200)
const ALL_MIN = Math.min(...PRICE_DATA) * 0.995
const ALL_MAX = Math.max(...PRICE_DATA) * 1.005
const RANGE = ALL_MAX - ALL_MIN

// card layout constants
const CARD_W = 1140
const CARD_PAD_X = 64
const CARD_PAD_TOP = 52
const HEADER_H = 30
const HEADER_MB = 8
const PRICE_H = 64
const PRICE_MB = 24
const CHART_W = 1012
const CHART_H = 280

// how far down in the card the chart SVG starts
const CHART_TOP_IN_CARD =
  CARD_PAD_TOP + HEADER_H + HEADER_MB + PRICE_H + PRICE_MB

// approximate card height for centering
const CARD_H_APPROX = CHART_TOP_IN_CARD + CHART_H + 48 + 30 // chart + pad-bottom + labels

export const USDHPriceChart = () => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  // card entrance spring
  const entrance = spring({ frame, fps, config: { damping: 200 } })
  const cardScale = interpolate(entrance, [0, 1], [0.93, 1])
  const cardOpacity = interpolate(frame, [0, 10], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // chart draw progress
  const chartProgress = interpolate(frame, [8, 138], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.bezier(0.22, 0.1, 0.25, 1),
  })

  const visibleCount = Math.max(2, Math.floor(chartProgress * PRICE_DATA.length))
  const currentData = PRICE_DATA.slice(0, visibleCount)
  const currentPrice = currentData[currentData.length - 1]
  const priceChange =
    ((currentPrice - PRICE_DATA[0]) / PRICE_DATA[0]) * 100

  // svg points
  const svgPoints = currentData.map((p, i) => {
    const x = (i / (PRICE_DATA.length - 1)) * CHART_W
    const y = CHART_H - ((p - ALL_MIN) / RANGE) * CHART_H
    return { x, y }
  })

  const polyline = svgPoints.map((pt) => `${pt.x},${pt.y}`).join(' ')
  const last = svgPoints[svgPoints.length - 1]
  const fillPoly = `0,${CHART_H} ${polyline} ${last.x},${CHART_H}`
  const pulse = interpolate(frame % 30, [0, 15, 30], [1, 1.6, 1])

  // brand text fade
  const brandOpacity = interpolate(frame, [60, 80], [0, 0.25], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // --- CAMERA ZOOM ---
  // zoomed in on dot for ~1.4s, then smooth pull-out over ~1s
  const zoomProgress = interpolate(frame, [42, 72], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.quad),
  })

  const zoom = interpolate(zoomProgress, [0, 1], [2.4, 1.3])

  // dot's screen position (card is centered in 1920x1080)
  const cardLeft = (1920 - CARD_W) / 2
  const cardTop = (1080 - CARD_H_APPROX) / 2
  const dotScreenX = cardLeft + CARD_PAD_X + last.x
  const dotScreenY = cardTop + CHART_TOP_IN_CARD + last.y

  // transform-origin tracks the dot when zoomed, eases to center on pull-out
  const originX = interpolate(zoomProgress, [0, 1], [dotScreenX, 960])
  const originY = interpolate(zoomProgress, [0, 1], [dotScreenY, 540])

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* zoomable scene */}
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
          transform: `scale(${zoom})`,
          transformOrigin: `${originX}px ${originY}px`,
        }}
      >
        {/* dot grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage:
              'radial-gradient(circle, rgba(0,0,0,0.06) 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* card */}
        <div
          style={{
            opacity: cardOpacity,
            transform: `scale(${cardScale})`,
            backgroundColor: 'white',
            border: '3px solid black',
            borderRadius: 24,
            padding: `${CARD_PAD_TOP}px ${CARD_PAD_X}px 48px`,
            width: CARD_W,
            boxShadow: '10px 10px 0px black',
          }}
        >
          {/* header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: HEADER_MB,
              height: HEADER_H,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontFamily: mono,
                fontWeight: 400,
                letterSpacing: '0.12em',
                color: 'rgba(0,0,0,0.4)',
              }}
            >
              USDH PRICE HISTORY
            </span>
            <span
              style={{
                padding: '6px 16px',
                fontSize: 15,
                fontFamily: inter,
                fontWeight: 900,
                borderRadius: 999,
                border: '2px solid black',
                backgroundColor: '#CDFF57',
                color: 'black',
                boxShadow: '3px 3px 0px black',
              }}
            >
              +{priceChange.toFixed(2)}% (7d)
            </span>
          </div>

          {/* price */}
          <div
            style={{
              fontSize: PRICE_H,
              fontWeight: 900,
              color: 'black',
              marginBottom: PRICE_MB,
              letterSpacing: '-0.025em',
              lineHeight: 1,
            }}
          >
            ${currentPrice.toFixed(4)}
          </div>

          {/* chart */}
          <svg
            viewBox={`0 0 ${CHART_W} ${CHART_H}`}
            width={CHART_W}
            height={CHART_H}
            style={{ overflow: 'visible' }}
          >
            <defs>
              <linearGradient id="chartGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#CDFF57" stopOpacity={0.5} />
                <stop offset="100%" stopColor="#CDFF57" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* grid lines */}
            {[0.25, 0.5, 0.75].map((t) => (
              <line
                key={t}
                x1={0}
                y1={CHART_H * t}
                x2={CHART_W}
                y2={CHART_H * t}
                stroke="rgba(0,0,0,0.06)"
                strokeWidth={1}
                strokeDasharray="6,4"
              />
            ))}

            {/* y-axis labels as pills */}
            {[0, 0.5, 1].map((t) => {
              const price = ALL_MAX - t * RANGE
              const yPos = CHART_H * t
              return (
                <g key={t}>
                  <rect
                    x={CHART_W - 72}
                    y={yPos - 11}
                    width={62}
                    height={22}
                    rx={6}
                    fill="rgba(255,255,255,0.85)"
                    stroke="rgba(0,0,0,0.08)"
                    strokeWidth={1}
                  />
                  <text
                    x={CHART_W - 41}
                    y={yPos + 4}
                    fontSize={10}
                    fontFamily={mono}
                    fill="rgba(0,0,0,0.35)"
                    textAnchor="middle"
                  >
                    ${price.toFixed(2)}
                  </text>
                </g>
              )
            })}

            {/* gradient fill */}
            <polygon points={fillPoly} fill="url(#chartGrad)" />

            {/* line */}
            <polyline
              points={polyline}
              fill="none"
              stroke="#9ACC20"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* pulse */}
            <circle
              cx={last.x}
              cy={last.y}
              r={10 * pulse}
              fill="#CDFF57"
              opacity={0.3}
            />

            {/* dot */}
            <circle
              cx={last.x}
              cy={last.y}
              r={6}
              fill="#9ACC20"
              stroke="black"
              strokeWidth={2.5}
            />
          </svg>

          {/* time labels */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginTop: 14,
              fontSize: 11,
              fontFamily: mono,
              color: 'rgba(0,0,0,0.3)',
            }}
          >
            <span>7d ago</span>
            <span>now</span>
          </div>
        </div>

        {/* brand */}
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
      </div>
    </div>
  )
}
