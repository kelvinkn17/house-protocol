import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { cnm } from '@/utils/style'

export const Route = createFileRoute('/explore/build')({
  component: BuildLayout,
})

function BuildLayout() {
  const location = useLocation()
  const path = location.pathname

  // check if we're on a sub-route or the main build page
  const isIndex = path === '/explore/build' || path === '/explore/build/'

  if (isIndex) {
    return <BuildIndexPage />
  }

  return (
    <div className="min-h-screen">
      {/* sub nav */}
      <div className="border-b border-neutral-800 bg-neutral-900/50">
        <div className="mx-auto flex max-w-6xl gap-6 px-4">
          <SubNavLink to="/explore/build/games" active={path.includes('/games')}>
            My Games
          </SubNavLink>
          <SubNavLink to="/explore/build/keys" active={path.includes('/keys')}>
            API Keys
          </SubNavLink>
          <SubNavLink to="/explore/build/analytics" active={path.includes('/analytics')}>
            Analytics
          </SubNavLink>
        </div>
      </div>
      <Outlet />
    </div>
  )
}

function SubNavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cnm(
        'border-b-2 py-3 text-sm font-medium transition-colors',
        active
          ? 'border-neutral-100 text-neutral-100'
          : 'border-transparent text-neutral-500 hover:text-neutral-300'
      )}
    >
      {children}
    </Link>
  )
}

// main build landing page
function BuildIndexPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4">
        {/* hero */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-4xl font-bold text-neutral-100">Build on House Protocol</h1>
          <p className="mx-auto max-w-2xl text-lg text-neutral-400">
            Create gambling games without writing a single line of backend code. Pick a game type,
            configure it, integrate our SDK, and start earning 25% of house edge.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/explore/build/games"
              className="rounded-lg bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              Create Your First Game
            </Link>
            <a
              href="#"
              className="rounded-lg border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-100 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
            >
              Read Docs
            </a>
          </div>
        </div>

        {/* how it works */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold text-neutral-100">How it works</h2>
          <div className="grid gap-6 md:grid-cols-4">
            <StepCard
              step={1}
              title="Pick a game type"
              description="Choose from coinflip, dice, crash, mines, and more. Each has enforced payout math."
            />
            <StepCard
              step={2}
              title="Configure"
              description="Set your house edge (min 1%), name, description, and visual assets."
            />
            <StepCard
              step={3}
              title="Integrate SDK"
              description="Add our React hooks to your frontend. We handle state channels and settlements."
            />
            <StepCard
              step={4}
              title="Earn"
              description="Players play on your site. You earn 25% of every bet's house edge."
            />
          </div>
        </div>

        {/* game types */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold text-neutral-100">
            Available Game Types
          </h2>
          <div className="grid gap-4 md:grid-cols-3">
            <GameTypeCard
              type="Pick One"
              description="Player picks an option, one wins. Classic coinflip, color picker, etc."
              formula="payout = (1/chance) * (1 - houseEdge)"
            />
            <GameTypeCard
              type="Pick Number"
              description="Player sets a target number, wins if roll is over/under."
              formula="payout = (100/target) * (1 - houseEdge)"
            />
            <GameTypeCard
              type="Cash Out"
              description="Multiplier grows over time, player must cash out before crash."
              formula="payout = multiplier at cashout"
            />
            <GameTypeCard
              type="Reveal Tiles"
              description="Grid of tiles, some are safe, some are mines. Reveal to win."
              formula="payout based on tiles revealed"
            />
            <GameTypeCard
              type="Spin Wheel"
              description="Wheel with weighted segments. Spin and win based on landing."
              formula="payout based on segment weight"
            />
            <GameTypeCard
              type="Deal Cards"
              description="Card games where player beats the dealer."
              formula="standard blackjack payouts"
            />
          </div>
        </div>

        {/* revenue */}
        <div className="mb-16 rounded-xl border border-neutral-800 bg-neutral-900/50 p-8">
          <h2 className="mb-6 text-center text-2xl font-semibold text-neutral-100">
            Revenue Distribution
          </h2>
          <div className="mx-auto max-w-md">
            <p className="mb-6 text-center text-neutral-400">
              On a $100 bet with 2% house edge ($2.00 total)
            </p>
            <div className="space-y-3">
              <RevenueRow label="Stakers (Vault)" amount="$1.40" percent="70%" />
              <RevenueRow label="You (Builder)" amount="$0.50" percent="25%" highlight />
              <RevenueRow label="Protocol" amount="$0.10" percent="5%" />
            </div>
          </div>
        </div>

        {/* sdk preview */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-2xl font-semibold text-neutral-100">
            SDK Integration
          </h2>
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
            <div className="border-b border-neutral-800 px-4 py-2">
              <span className="text-sm text-neutral-500">your-game.tsx</span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm text-neutral-300">
              <code>{`import { useSession, useBet } from '@house-protocol/sdk'

function MyDiceGame() {
  const { session, openSession, closeSession } = useSession()
  const { placeBet, balance } = useBet('my-dice-game')

  const roll = async (target: number, amount: number) => {
    // protocol calculates outcome, you just render it
    const result = await placeBet({ target, amount })
    // result.roll, result.won, result.payout
  }

  return <YourGameUI onRoll={roll} balance={balance} />
}`}</code>
            </pre>
          </div>
        </div>

        {/* cta */}
        <div className="text-center">
          <h2 className="mb-4 text-2xl font-semibold text-neutral-100">Ready to build?</h2>
          <p className="mb-6 text-neutral-400">
            Create your first game in minutes. No smart contracts to write, no servers to run.
          </p>
          <Link
            to="/explore/build/games"
            className="inline-block rounded-lg bg-neutral-100 px-8 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
          >
            Get Started
          </Link>
        </div>
      </div>
    </div>
  )
}

function StepCard({ step, title, description }: { step: number; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <div className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-neutral-800 text-sm font-medium text-neutral-300">
        {step}
      </div>
      <h3 className="mb-2 font-semibold text-neutral-100">{title}</h3>
      <p className="text-sm text-neutral-400">{description}</p>
    </div>
  )
}

function GameTypeCard({
  type,
  description,
  formula,
}: {
  type: string
  description: string
  formula: string
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
      <h3 className="mb-2 font-semibold text-neutral-100">{type}</h3>
      <p className="mb-3 text-sm text-neutral-400">{description}</p>
      <p className="font-mono text-xs text-neutral-500">{formula}</p>
    </div>
  )
}

function RevenueRow({
  label,
  amount,
  percent,
  highlight,
}: {
  label: string
  amount: string
  percent: string
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={cnm('text-sm', highlight ? 'text-neutral-100' : 'text-neutral-400')}>
        {label}
      </span>
      <div className="flex items-center gap-3">
        <span className={cnm('font-medium', highlight ? 'text-green-400' : 'text-neutral-100')}>
          {amount}
        </span>
        <span className="text-sm text-neutral-500">{percent}</span>
      </div>
    </div>
  )
}
