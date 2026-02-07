import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import AppLayout from '@/components/layout/AppLayout'
import HeroSection from '@/components/landing/HeroSection'
import IntroAnimation from '@/components/landing/IntroAnimation'
import MarqueeStrip from '@/components/landing/MarqueeStrip'
import VideoSection from '@/components/landing/VideoSection'
import StatsSection from '@/components/landing/StatsSection'
import HowItWorksSection from '@/components/landing/HowItWorksSection'
import GamePrimitivesSection from '@/components/landing/GamePrimitivesSection'
import InfraSection from '@/components/landing/InfraSection'
import FinalCTA from '@/components/landing/FinalCTA'

export const Route = createFileRoute('/')({
  component: LandingPage,
})

function LandingPage() {
  const [introComplete, setIntroComplete] = useState(false)
  const [heroStarted, setHeroStarted] = useState(false)

  return (
    <>
      {!introComplete && (
        <IntroAnimation
          onHeroStart={() => setHeroStarted(true)}
          onComplete={() => setIntroComplete(true)}
        />
      )}
      <AppLayout noPadding hideNavLogo={!introComplete}>
        <div className="overflow-x-hidden selection:bg-[#CDFF57] selection:text-black relative">
          <HeroSection introComplete={heroStarted} />
          <MarqueeStrip />
          <VideoSection />
          <StatsSection />
          <HowItWorksSection />
          <GamePrimitivesSection />
          <InfraSection />
          <FinalCTA />
        </div>
      </AppLayout>
    </>
  )
}
