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
      <div className="overflow-x-hidden selection:bg-[#CDFF57] selection:text-black relative">
        <HeroSection />
        <MarqueeStrip />
        <StatsSection />
        {/* <RolesSection /> */}
        <HowItWorksSection />
        <GamePrimitivesSection />
        <TestimonialsSection />
        <InfraSection />
        <FinalCTA />
      </div>
    </AppLayout>
  )
}
