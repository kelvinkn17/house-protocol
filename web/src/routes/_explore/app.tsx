import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/_explore/app')({
  component: AppLayout,
})

function AppLayout() {
  return <Outlet />
}
