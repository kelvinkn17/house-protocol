import { createFileRoute, Outlet } from '@tanstack/react-router'
import AppLayout from '@/components/layout/AppLayout'

export const Route = createFileRoute('/app')({
  component: AppLayoutWrapper,
})

function AppLayoutWrapper() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  )
}
