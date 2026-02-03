import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_explore/app/play/$slug')({
  component: GamePage,
})

function GamePage() {
  const { slug } = Route.useParams()

  return (
    <div className="min-h-screen py-8">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex h-[60vh] flex-col items-center justify-center text-center">
          <p className="mb-2 text-sm text-neutral-500">Game</p>
          <h1 className="mb-4 text-3xl font-bold capitalize text-neutral-100">{slug}</h1>
          <p className="text-neutral-400">Game UI coming soon</p>
        </div>
      </div>
    </div>
  )
}
