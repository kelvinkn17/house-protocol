import { createFileRoute, Link } from '@tanstack/react-router'
import AnimatedText from '@/components/elements/AnimatedText'
import AnimateComponent from '@/components/elements/AnimateComponent'
import DoubleOrNothing from '@/components/games/DoubleOrNothing'
import Death from '@/components/games/Death'
import Range from '@/components/games/Range'

export const Route = createFileRoute('/app/play/$slug')({
  component: GamePage,
})

const GAME_CONFIG: Record<
  string,
  {
    name: string
    type: string
    color: string
    Component: React.ComponentType
  }
> = {
  'double-or-nothing': {
    name: 'Double or Nothing',
    type: 'cash-out',
    color: '#CDFF57',
    Component: DoubleOrNothing,
  },
  death: {
    name: 'Death',
    type: 'reveal-tiles',
    color: '#FF6B9D',
    Component: Death,
  },
  range: {
    name: 'Range',
    type: 'pick-number',
    color: '#dcb865',
    Component: Range,
  },
}

function GamePage() {
  const { slug } = Route.useParams()
  const game = GAME_CONFIG[slug]

  if (!game) {
    return (
      <div className="flex h-[40vh] flex-col items-center justify-center text-center">
        <h1 className="mb-4 text-3xl font-black text-black">Game not found</h1>
        <Link
          to="/app/play"
          className="text-sm font-black text-black/50 hover:text-black transition-colors"
        >
          Back to games
        </Link>
      </div>
    )
  }

  const GameComponent = game.Component

  // key forces full remount on game change so animations replay
  const letterCount = game.name.length

  return (
    <div key={slug}>
      <div className="mb-6 flex items-center gap-3">
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-black">
          <span className="block overflow-hidden">
            <AnimatedText text={game.name.toUpperCase()} delay={0} stagger={12} />
          </span>
        </h1>
        <AnimateComponent delay={letterCount * 12 + 50} variant="scaleIn" duration={0.25}>
          <span
            className="px-2.5 py-0.5 text-[10px] font-black uppercase rounded-full border-2 border-black text-black"
            style={{ backgroundColor: game.color, boxShadow: '2px 2px 0px black' }}
          >
            {game.type}
          </span>
        </AnimateComponent>
      </div>

      <GameComponent />
    </div>
  )
}
