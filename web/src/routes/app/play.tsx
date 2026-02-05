import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/app/play')({
  component: PlayLayout,
})

function PlayLayout() {
  return <Outlet />
}
