import { Composition } from 'remotion'
import { USDHPriceChart } from './USDHPriceChart'
import { RoleCards } from './RoleCards'
import { RangeGame } from './RangeGame'
import { OldWay } from './OldWay'
import { HeroLanding } from './HeroLanding'

export const RemotionRoot = () => {
  return (
    <>
      <Composition
        id="USDHPriceChart"
        component={USDHPriceChart}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="RoleCards"
        component={RoleCards}
        durationInFrames={270}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="RangeGame"
        component={RangeGame}
        durationInFrames={240}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="OldWay"
        component={OldWay}
        durationInFrames={150}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="HeroLanding"
        component={HeroLanding}
        durationInFrames={180}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  )
}
