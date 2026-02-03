import { createFileRoute, Outlet, useLocation } from '@tanstack/react-router'
import AppLayout from '@/components/layout/AppLayout'

export const Route = createFileRoute('/explore')({
  component: ExploreLayout,
})

function ExploreLayout() {
  const location = useLocation()
  const path = location.pathname
  const isLanding = path === '/explore' || path === '/explore/'

  return (
    <AppLayout noPadding={isLanding}>
      <Outlet />
    </AppLayout>
  )
}
