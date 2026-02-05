import { createFileRoute, Link } from '@tanstack/react-router'
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
    Component: React.ComponentType
  }
> = {
  'double-or-nothing': {
    name: 'Double or Nothing',
    type: 'cash-out',
    Component: DoubleOrNothing,
  },
  death: {
    name: 'Death',
    type: 'reveal-tiles',
    Component: Death,
  },
  range: {
    name: 'Range',
    type: 'pick-number',
    Component: Range,
  },
}

function GamePage() {
  const { slug } = Route.useParams()
  const game = GAME_CONFIG[slug]

  if (!game) {
    return (
      <div className="pb-12">
        <div className="mx-auto max-w-6xl">
          <div className="flex h-[40vh] flex-col items-center justify-center text-center">
            <h1 className="mb-4 text-3xl font-black text-black">Game not found</h1>
            <Link
              to="/app/play"
              className="text-sm font-black text-black/50 hover:text-black transition-colors"
            >
              Back to games
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const GameComponent = game.Component

  return (
    <div className="pb-12">
      <div className="mx-auto max-w-6xl">
        {/* header */}
        <AnimateComponent delay={50}>
          <div className="mb-8">
            <Link
              to="/app/play"
              className="inline-block text-xs font-black text-black/40 hover:text-black transition-colors uppercase tracking-wider mb-4"
            >
              &larr; Games
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-black tracking-tight text-black">
                {game.name}
              </h1>
              <span
                className="px-3 py-1 text-[10px] font-black uppercase rounded-full border-2 border-black bg-[#CDFF57]"
                style={{ boxShadow: '2px 2px 0px black' }}
              >
                {game.type}
              </span>
            </div>
          </div>
        </AnimateComponent>

        {/* game content */}
        <AnimateComponent delay={150}>
          <GameComponent />
        </AnimateComponent>
      </div>
    </div>
  )
}
