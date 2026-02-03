import { createFileRoute } from '@tanstack/react-router'
import AppLayout from '@/components/layout/AppLayout'
import HeroSection from '@/components/landing/HeroSection'
import MarqueeStrip from '@/components/landing/MarqueeStrip'
import StatsSection from '@/components/landing/StatsSection'
import RolesSection from '@/components/landing/RolesSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import GamePrimitivesSection from '@/components/landing/GamePrimitivesSection'
import TestimonialsSection from '@/components/landing/TestimonialsSection'
import InfraSection from '@/components/landing/InfraSection'
import FinalCTA from '@/components/landing/FinalCTA'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  return (
    <AppLayout noPadding>
      <div className="overflow-x-hidden selection:bg-[#dcb865] selection:text-[#0b0d0b] relative">
        {/* noise texture overlay for brutalist authenticity */}
        <div
          className="fixed inset-0 pointer-events-none z-[100] opacity-[0.025]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
        <HeroSection />
        <MarqueeStrip />
        <StatsSection />
        <RolesSection />
        <HowItWorksSection />
        <GamePrimitivesSection />
        <TestimonialsSection />
        <InfraSection />
        <FinalCTA />
      </div>
    </AppLayout>
  )
}
