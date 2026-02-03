import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/explore/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <div className="min-h-screen">
      {/* hero */}
      <section className="flex min-h-[80vh] flex-col items-center justify-center px-4 text-center">
        <p className="mb-4 text-sm font-medium uppercase tracking-widest text-neutral-500">
          Shared Liquidity Layer
        </p>
        <h1 className="mb-6 text-5xl font-bold tracking-tight text-neutral-100 md:text-7xl">
          Everyone can be
          <br />
          the house.
        </h1>
        <p className="mb-10 max-w-xl text-lg text-neutral-400">
          A shared liquidity protocol for on-chain gambling. Stakers provide capital, players bet
          gasless, builders create games without code.
        </p>
        <div className="flex gap-4">
          <Link
            to="/explore/app/stake"
            className="rounded-lg bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
          >
            Start Staking
          </Link>
          <Link
            to="/explore/build"
            className="rounded-lg border border-neutral-700 px-6 py-3 text-sm font-medium text-neutral-100 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
          >
            Build a Game
          </Link>
        </div>
      </section>

      {/* stats bar */}
      <section className="border-y border-neutral-800 bg-neutral-900/50">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-px bg-neutral-800 md:grid-cols-4">
          <StatCard label="Total Value Locked" value="$2.4M" />
          <StatCard label="Total Volume" value="$18.7M" />
          <StatCard label="Active Sessions" value="342" />
          <StatCard label="Games Built" value="27" />
        </div>
      </section>

      {/* how it works */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-4 text-center text-sm font-medium uppercase tracking-widest text-neutral-500">
            How it works
          </h2>
          <p className="mb-16 text-center text-3xl font-semibold text-neutral-100">
            Three ways to participate
          </p>

          <div className="grid gap-8 md:grid-cols-3">
            <RoleCard
              title="Stakers"
              description="Deposit USDC into the House Vault, receive yield bearing hUSDC. Earn from house edge when players lose."
              items={['Deposit USDC, get hUSDC', 'Earn from house edge', 'Withdraw anytime']}
              cta="Start Earning"
              to="/explore/app/stake"
            />
            <RoleCard
              title="Players"
              description="Open a betting session with one transaction, play unlimited games gasless, close and settle."
              items={['1 tx to open session', 'Gasless betting', '1 tx to close']}
              cta="Start Playing"
              to="/explore/app/play"
            />
            <RoleCard
              title="Builders"
              description="Pick game types, configure parameters, host on your own site. Keep your brand, skip the infra."
              items={['No code required', '25% of house edge', 'Your domain']}
              cta="Start Building"
              to="/explore/build"
            />
          </div>
        </div>
      </section>

      {/* game types */}
      <section className="border-t border-neutral-800 bg-neutral-900/30 py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-4 text-center text-sm font-medium uppercase tracking-widest text-neutral-500">
            Game Types
          </h2>
          <p className="mb-16 text-center text-3xl font-semibold text-neutral-100">
            Premade primitives, enforced math
          </p>

          <div className="grid gap-4 md:grid-cols-3">
            <GameTypeCard
              type="Pick One"
              mechanic="Player picks option, one wins"
              examples="Coinflip, Color"
            />
            <GameTypeCard
              type="Pick Number"
              mechanic="Player sets target, over/under"
              examples="Dice, Limbo"
            />
            <GameTypeCard
              type="Spin Wheel"
              mechanic="Wheel lands on segment"
              examples="Roulette"
            />
            <GameTypeCard
              type="Reveal Tiles"
              mechanic="Pick tiles, avoid danger"
              examples="Mines, Tower"
            />
            <GameTypeCard
              type="Cash Out"
              mechanic="Multiplier grows, cash out before crash"
              examples="Crash, Rocket"
            />
            <GameTypeCard
              type="Deal Cards"
              mechanic="Cards dealt, beat dealer"
              examples="Blackjack"
            />
          </div>
        </div>
      </section>

      {/* tech stack */}
      <section className="py-24">
        <div className="mx-auto max-w-6xl px-4">
          <h2 className="mb-4 text-center text-sm font-medium uppercase tracking-widest text-neutral-500">
            Built On
          </h2>
          <p className="mb-16 text-center text-3xl font-semibold text-neutral-100">
            Production grade infrastructure
          </p>

          <div className="grid gap-4 md:grid-cols-4">
            <TechCard title="Yellow Network" description="State channels for gasless betting" />
            <TechCard title="Chainlink VRF" description="Verifiable randomness" />
            <TechCard title="Circle CCTP" description="Cross-chain USDC deposits" />
            <TechCard title="ERC-4626" description="Yield-bearing vault standard" />
          </div>
        </div>
      </section>

      {/* cta */}
      <section className="border-t border-neutral-800 py-24">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <h2 className="mb-4 text-3xl font-semibold text-neutral-100">Ready to get started?</h2>
          <p className="mb-8 text-neutral-400">
            Whether you want to earn yield, play games, or build your own casino, House Protocol has
            you covered.
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/explore/app/stake"
              className="rounded-lg bg-neutral-100 px-6 py-3 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-200"
            >
              Launch App
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-neutral-900 px-6 py-8 text-center">
      <p className="mb-1 text-2xl font-semibold text-neutral-100">{value}</p>
      <p className="text-sm text-neutral-500">{label}</p>
    </div>
  )
}

function RoleCard({
  title,
  description,
  items,
  cta,
  to,
}: {
  title: string
  description: string
  items: string[]
  cta: string
  to: string
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6">
      <h3 className="mb-2 text-xl font-semibold text-neutral-100">{title}</h3>
      <p className="mb-4 text-sm text-neutral-400">{description}</p>
      <ul className="mb-6 space-y-2">
        {items.map((item) => (
          <li key={item} className="flex items-center gap-2 text-sm text-neutral-300">
            <span className="h-1 w-1 rounded-full bg-neutral-500" />
            {item}
          </li>
        ))}
      </ul>
      <Link
        to={to}
        className="block rounded-lg border border-neutral-700 py-2 text-center text-sm font-medium text-neutral-100 transition-colors hover:border-neutral-500 hover:bg-neutral-800"
      >
        {cta}
      </Link>
    </div>
  )
}

function GameTypeCard({
  type,
  mechanic,
  examples,
}: {
  type: string
  mechanic: string
  examples: string
}) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
      <p className="mb-1 font-semibold text-neutral-100">{type}</p>
      <p className="mb-2 text-sm text-neutral-400">{mechanic}</p>
      <p className="text-xs text-neutral-500">e.g. {examples}</p>
    </div>
  )
}

function TechCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 text-center">
      <p className="mb-1 font-semibold text-neutral-100">{title}</p>
      <p className="text-sm text-neutral-500">{description}</p>
    </div>
  )
}
