import { createFileRoute, Navigate } from '@tanstack/react-router'

export const Route = createFileRoute('/app/play/')({
  component: PlayIndex,
})

function PlayIndex() {
  return <Navigate to="/app/play/$slug" params={{ slug: 'double-or-nothing' }} />
}
