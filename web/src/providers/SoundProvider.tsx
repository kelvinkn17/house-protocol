import { createContext, useContext, useRef, useCallback, type ReactNode } from 'react'

// all synth, no mp3s. hybrid: percussive pluck transient + smooth sine chirp
type SoundName = 'click' | 'action' | 'win' | 'lose' | 'cashout' | 'tick' | 'reveal'

interface SoundContextValue {
  play: (sound: SoundName) => void
  setEnabled: (on: boolean) => void
}

const SoundContext = createContext<SoundContextValue | null>(null)

export function useSound() {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used within SoundProvider')
  return ctx
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const ctxRef = useRef<AudioContext | null>(null)
  const enabledRef = useRef(true)

  const getCtx = useCallback(() => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  // the note: percussive pluck body + smooth chirp tail layered together
  // pluck = instant attack, fast drop, gives the "tack"
  // chirp = sine sweeping up, gives the smooth musicality
  const note = useCallback(
    (ctx: AudioContext, time: number, freq: number, vol = 0.15, dur = 0.09) => {
      // pluck layer: short percussive transient
      const pluckGain = ctx.createGain()
      pluckGain.gain.setValueAtTime(vol * 0.7, time)
      pluckGain.gain.exponentialRampToValueAtTime(0.001, time + dur * 0.4)
      pluckGain.connect(ctx.destination)
      const pluck = ctx.createOscillator()
      pluck.type = 'sine'
      pluck.frequency.setValueAtTime(freq * 1.5, time)
      pluck.frequency.exponentialRampToValueAtTime(freq * 0.8, time + dur * 0.3)
      pluck.connect(pluckGain)
      pluck.start(time)
      pluck.stop(time + dur * 0.5)

      // chirp layer: smooth body that sweeps up
      const chirpGain = ctx.createGain()
      chirpGain.gain.setValueAtTime(0.001, time)
      chirpGain.gain.linearRampToValueAtTime(vol, time + 0.006)
      chirpGain.gain.exponentialRampToValueAtTime(0.001, time + dur)
      chirpGain.connect(ctx.destination)
      const chirp = ctx.createOscillator()
      chirp.type = 'sine'
      chirp.frequency.setValueAtTime(freq, time)
      chirp.frequency.exponentialRampToValueAtTime(freq * 1.25, time + dur * 0.6)
      chirp.connect(chirpGain)
      chirp.start(time)
      chirp.stop(time + dur + 0.01)
    },
    [],
  )

  const sounds: Record<SoundName, () => void> = {
    // click: single quick tack-chirp
    click: () => {
      const ctx = getCtx()
      note(ctx, ctx.currentTime, 1300, 0.18, 0.06)
    },

    // action: three-step ascending, "tk-tk-tk"
    action: () => {
      const ctx = getCtx()
      const t = ctx.currentTime
      note(ctx, t, 800, 0.2, 0.06)
      note(ctx, t + 0.05, 1050, 0.24, 0.06)
      note(ctx, t + 0.1, 1350, 0.28, 0.07)
    },

    // win: warm ascending run, stays in a comfortable range
    win: () => {
      const ctx = getCtx()
      const t = ctx.currentTime
      const freqs = [520, 620, 740, 880]
      freqs.forEach((freq, i) => {
        note(ctx, t + i * 0.055, freq, 0.18, 0.1)
      })
      // gentle resolve
      note(ctx, t + 0.27, 1050, 0.18, 0.14)
    },

    // lose: three descending pluck-chirps, smooth but drooping
    lose: () => {
      const ctx = getCtx()
      const t = ctx.currentTime
      // descending: chirp sweeps down instead of up
      const freqs = [800, 580, 400]
      freqs.forEach((freq, i) => {
        const time = t + i * 0.07

        // pluck transient
        const pg = ctx.createGain()
        pg.gain.setValueAtTime(0.18, time)
        pg.gain.exponentialRampToValueAtTime(0.001, time + 0.035)
        pg.connect(ctx.destination)
        const po = ctx.createOscillator()
        po.type = 'sine'
        po.frequency.setValueAtTime(freq * 1.3, time)
        po.frequency.exponentialRampToValueAtTime(freq * 0.7, time + 0.03)
        po.connect(pg)
        po.start(time)
        po.stop(time + 0.05)

        // chirp body sweeping down
        const cg = ctx.createGain()
        cg.gain.setValueAtTime(0.001, time)
        cg.gain.linearRampToValueAtTime(0.2 - i * 0.03, time + 0.006)
        cg.gain.exponentialRampToValueAtTime(0.001, time + 0.1)
        cg.connect(ctx.destination)
        const co = ctx.createOscillator()
        co.type = 'sine'
        co.frequency.setValueAtTime(freq, time)
        co.frequency.exponentialRampToValueAtTime(freq * 0.65, time + 0.08)
        co.connect(cg)
        co.start(time)
        co.stop(time + 0.12)
      })
    },

    // cashout: rapid plucky scatter then a smooth ring
    cashout: () => {
      const ctx = getCtx()
      const t = ctx.currentTime

      // fast scatter of pluck-chirps going up
      ;[1600, 1900, 2200, 2500].forEach((freq, i) => {
        note(ctx, t + i * 0.03, freq, 0.15, 0.045)
      })

      // smooth ring on top
      const rt = t + 0.14
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.001, rt)
      g.gain.linearRampToValueAtTime(0.25, rt + 0.008)
      g.gain.exponentialRampToValueAtTime(0.001, rt + 0.22)
      g.connect(ctx.destination)
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.setValueAtTime(2200, rt)
      o.frequency.exponentialRampToValueAtTime(2600, rt + 0.07)
      o.connect(g)
      o.start(rt)
      o.stop(rt + 0.24)
    },

    // tick: tiny pluck-chirp, randomized
    tick: () => {
      const ctx = getCtx()
      const base = 1300 + Math.random() * 500
      note(ctx, ctx.currentTime, base, 0.1, 0.03)
    },

    // reveal: two-step "tup-POP"
    reveal: () => {
      const ctx = getCtx()
      const t = ctx.currentTime
      note(ctx, t, 900, 0.18, 0.05)
      note(ctx, t + 0.04, 1300, 0.25, 0.065)
    },
  }

  const play = useCallback(
    (sound: SoundName) => {
      if (!enabledRef.current) return
      try {
        sounds[sound]()
      } catch {
        // audio context blocked or unavailable, no biggie
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  const setEnabled = useCallback((on: boolean) => {
    enabledRef.current = on
  }, [])

  return <SoundContext.Provider value={{ play, setEnabled }}>{children}</SoundContext.Provider>
}
