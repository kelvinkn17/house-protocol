import { createFileRoute, Link, Outlet, useLocation } from '@tanstack/react-router'
import { cnm } from '@/utils/style'
import AppLayout from '@/components/layout/AppLayout'

export const Route = createFileRoute('/build')({
  component: BuildLayout,
})

function BuildLayout() {
  const location = useLocation()
  const path = location.pathname

  const isIndex = path === '/build' || path === '/build/'

  if (isIndex) {
    return (
      <AppLayout>
        <BuildIndexPage />
      </AppLayout>
    )
  }

  return (
    <AppLayout>
      <div className="min-h-screen">
        {/* sub nav */}
        <div className="border-b border-neutral-800 bg-neutral-900/50">
          <div className="mx-auto flex max-w-6xl gap-6 px-4">
            <SubNavLink to="/build/games" active={path.includes('/games')}>
              My Games
            </SubNavLink>
            <SubNavLink to="/build/keys" active={path.includes('/keys')}>
              API Keys
            </SubNavLink>
            <SubNavLink to="/build/analytics" active={path.includes('/analytics')}>
              Analytics
            </SubNavLink>
          </div>
        </div>
        <Outlet />
      </div>
    </AppLayout>
  )
}

function SubNavLink({ to, active, children }: { to: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className={cnm(
        'border-b-2 py-3 text-sm font-medium transition-colors',
        active ? 'border-neutral-100 text-neutral-100' : 'border-transparent text-neutral-500 hover:text-neutral-300'
      )}
    >
      {children}
    </Link>
  )
}

function BuildIndexPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-4xl px-4">
        {/* hero */}
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-3xl font-bold text-neutral-100">Build on House Protocol</h1>
          <p className="mx-auto max-w-xl text-neutral-400">
            Create games without backend code. Pick a type, configure, integrate SDK. Earn 25% of house edge.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              to="/build/games/new"
              className="rounded-lg bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              Create Game
            </Link>
            <Link
              to="/build/games"
              className="rounded-lg border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-100 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
            >
              My Games
            </Link>
          </div>
        </div>

        {/* steps */}
        <div className="mb-16">
          <h2 className="mb-8 text-center text-xl font-semibold text-neutral-100">How it works</h2>
          <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
            <Step n={1} title="Pick type" desc="Coinflip, dice, crash, etc." />
            <Step n={2} title="Configure" desc="House edge, name, visuals" />
            <Step n={3} title="Integrate" desc="Add SDK to your frontend" />
            <Step n={4} title="Earn" desc="25% of every bet's edge" />
          </div>
        </div>

        {/* revenue */}
        <div className="mb-16 rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
          <h2 className="mb-6 text-center text-xl font-semibold text-neutral-100">Revenue Split</h2>
          <p className="mb-4 text-center text-sm text-neutral-500">$100 bet, 2% house edge = $2.00 total</p>
          <div className="mx-auto max-w-xs space-y-2">
            <Row label="Stakers" value="$1.40" sub="70%" />
            <Row label="You" value="$0.50" sub="25%" highlight />
            <Row label="Protocol" value="$0.10" sub="5%" />
          </div>
        </div>

        {/* sdk */}
        <div className="mb-16">
          <h2 className="mb-6 text-center text-xl font-semibold text-neutral-100">SDK Preview</h2>
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-neutral-900">
            <div className="border-b border-neutral-800 px-4 py-2">
              <span className="text-sm text-neutral-500">your-game.tsx</span>
            </div>
            <pre className="overflow-x-auto p-4 text-sm text-neutral-300">
              <code>{`import { useSession, useBet } from '@house-protocol/sdk'

function MyGame() {
  const { openSession, closeSession } = useSession()
  const { placeBet, balance } = useBet('my-game')

  const play = async (choice, amount) => {
    const result = await placeBet({ choice, amount })
    // result.won, result.payout
  }

  return <YourUI onPlay={play} balance={balance} />
}`}</code>
            </pre>
          </div>
        </div>

        {/* cta */}
        <div className="text-center">
          <Link
            to="/build/games/new"
            className="inline-block rounded-lg bg-neutral-100 px-8 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
          >
            Create Your First Game
          </Link>
        </div>
      </div>
    </div>
  )
}

function Step({ n, title, desc }: { n: number; title: string; desc: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <div className="mb-2 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-800 text-xs font-medium text-neutral-400">
        {n}
      </div>
      <p className="font-medium text-neutral-100">{title}</p>
      <p className="text-sm text-neutral-500">{desc}</p>
    </div>
  )
}

function Row({ label, value, sub, highlight }: { label: string; value: string; sub: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-neutral-400">{label}</span>
      <div className="flex items-center gap-2">
        <span className={cnm('font-medium', highlight ? 'text-green-400' : 'text-neutral-100')}>{value}</span>
        <span className="text-xs text-neutral-500">{sub}</span>
      </div>
    </div>
  )
}
