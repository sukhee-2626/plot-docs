import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import './splash.css'

const SHOWN_KEY = 'plotdocs.splash.shown'
const HOLD_KEY = 'plotdocs.splash.hold'
/** 0.5 minutes by default: a calm, Excel-style launch sequence. */
const DEFAULT_HOLD_MS = 30_000
const FADE_MS = 720

type ParticleStyle = CSSProperties & {
  '--particle-size': string
  '--particle-delay': string
  '--particle-duration': string
  '--particle-drift': string
}

const PARTICLES: Array<{ left: string; top: string; style: ParticleStyle }> = [
  { left: '18%', top: '30%', style: { '--particle-size': '3px', '--particle-delay': '-0.4s', '--particle-duration': '6.4s', '--particle-drift': '22px' } as ParticleStyle },
  { left: '24%', top: '70%', style: { '--particle-size': '2px', '--particle-delay': '-3.1s', '--particle-duration': '7.2s', '--particle-drift': '-18px' } as ParticleStyle },
  { left: '31%', top: '18%', style: { '--particle-size': '1.5px', '--particle-delay': '-1.7s', '--particle-duration': '5.6s', '--particle-drift': '15px' } as ParticleStyle },
  { left: '38%', top: '82%', style: { '--particle-size': '2.5px', '--particle-delay': '-5.2s', '--particle-duration': '8.1s', '--particle-drift': '24px' } as ParticleStyle },
  { left: '62%', top: '78%', style: { '--particle-size': '2px', '--particle-delay': '-2.2s', '--particle-duration': '6.8s', '--particle-drift': '-20px' } as ParticleStyle },
  { left: '71%', top: '24%', style: { '--particle-size': '3px', '--particle-delay': '-4.6s', '--particle-duration': '7.6s', '--particle-drift': '17px' } as ParticleStyle },
  { left: '79%', top: '62%', style: { '--particle-size': '1.5px', '--particle-delay': '-0.9s', '--particle-duration': '5.4s', '--particle-drift': '-14px' } as ParticleStyle },
  { left: '86%', top: '38%', style: { '--particle-size': '2.5px', '--particle-delay': '-6s', '--particle-duration': '8.5s', '--particle-drift': '26px' } as ParticleStyle },
  { left: '14%', top: '52%', style: { '--particle-size': '2px', '--particle-delay': '-2.8s', '--particle-duration': '7s', '--particle-drift': '19px' } as ParticleStyle },
  { left: '90%', top: '72%', style: { '--particle-size': '2px', '--particle-delay': '-4.1s', '--particle-duration': '6.2s', '--particle-drift': '-22px' } as ParticleStyle },
]

function holdMs(): number {
  try {
    const raw = localStorage.getItem(HOLD_KEY)
    if (raw === null) return DEFAULT_HOLD_MS
    const value = Number(raw)
    return Number.isFinite(value) && value >= 0 ? value : DEFAULT_HOLD_MS
  } catch {
    return DEFAULT_HOLD_MS
  }
}

const PHASES = [
  'Warming up the canvas…',
  'Preparing your workspace…',
  'Loading fonts and page geometry…',
  'Restoring your documents…',
  'Bringing the ribbon to life…',
  'Almost ready…',
]

function phaseFor(percent: number): string {
  return PHASES[Math.min(PHASES.length - 1, Math.floor((percent / 100) * PHASES.length))]
}

/**
 * Cinematic launch card: the Plot Docs ribbon mark with the violet
 * constellation, a real progress readout and a skippable 30-second intro.
 * Excel-style: one calm loading moment, then the workspace.
 */
export function SplashScreen({ onDone }: { onDone?: () => void }) {
  const duration = useRef(holdMs())
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem(SHOWN_KEY) === '1' || duration.current === 0
    } catch {
      return false
    }
  })
  const [exiting, setExiting] = useState(false)
  const [progress, setProgress] = useState(0)
  const doneRef = useRef(false)

  const complete = (): void => {
    if (doneRef.current) return
    doneRef.current = true
    onDone?.()
  }

  useEffect(() => {
    if (hidden) {
      complete()
      return
    }
    try {
      sessionStorage.setItem(SHOWN_KEY, '1')
    } catch {
      // storage can be unavailable in hardened windows; the splash still runs
    }
    const total = Math.max(0, duration.current)
    if (total === 0) {
      setHidden(true)
      return
    }
    const started = performance.now()
    const tick = window.setInterval(() => {
      const percent = Math.min(100, ((performance.now() - started) / total) * 100)
      setProgress(percent)
      if (percent >= 100) window.clearInterval(tick)
    }, 80)
    const timer = window.setTimeout(() => setExiting(true), total)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(tick)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hidden])

  useEffect(() => {
    if (!exiting) return
    const timer = window.setTimeout(() => {
      setHidden(true)
      complete()
    }, FADE_MS)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exiting])

  if (hidden) return null

  const skip = (): void => setExiting(true)

  return (
    <div
      className={`plot-splash${exiting ? ' is-exiting' : ''}`}
      role="status"
      aria-label="Plot Docs is starting"
      onClick={(event) => {
        if (event.target === event.currentTarget) skip()
      }}
    >
      <div className="plot-splash-noise" aria-hidden="true" />
      <div className="plot-splash-particles" aria-hidden="true">
        {PARTICLES.map((particle, index) => (
          <span
            key={index}
            className="plot-splash-particle"
            style={{ left: particle.left, top: particle.top, ...particle.style }}
          />
        ))}
      </div>

      <button className="plot-splash-skip" onClick={(event) => { event.stopPropagation(); skip() }}>
        Enter now
        <svg width="11" height="11" viewBox="0 0 12 12" aria-hidden="true">
          <path d="M2.5 6h7M6.5 3l3 3-3 3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div className="plot-splash-stage">
        <div className="plot-splash-aura" aria-hidden="true" />
        <div className="plot-splash-orbit plot-splash-orbit-a" aria-hidden="true"><i /></div>
        <div className="plot-splash-orbit plot-splash-orbit-b" aria-hidden="true"><i /></div>

        <svg
          className="plot-splash-mark"
          viewBox="0 0 512 512"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="plotSplashIconBg" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#0F172A" />
              <stop offset="50%" stopColor="#1E1B4B" />
              <stop offset="100%" stopColor="#090D16" />
            </linearGradient>
            <linearGradient id="plotSplashBorder" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#00F2FE" />
              <stop offset="50%" stopColor="#4F46E5" />
              <stop offset="100%" stopColor="#9333EA" />
            </linearGradient>
            <linearGradient id="plotSplashCyan" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="50%" stopColor="#0284C7" />
              <stop offset="100%" stopColor="#2563EB" />
            </linearGradient>
            <linearGradient id="plotSplashViolet" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#4338CA" />
              <stop offset="50%" stopColor="#6366F1" />
              <stop offset="100%" stopColor="#A855F7" />
            </linearGradient>
            <linearGradient id="plotSplashSparkle" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
            <filter height="140%" id="plotSplashGlow" width="140%" x="-20%" y="-20%">
              <feGaussianBlur result="blur" stdDeviation="10" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter height="160%" id="plotSplashIntense" width="160%" x="-30%" y="-30%">
              <feGaussianBlur result="blur" stdDeviation="16" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect
            fill="url(#plotSplashIconBg)"
            height="472"
            rx="112"
            stroke="url(#plotSplashBorder)"
            strokeWidth="3"
            width="472"
            x="20"
            y="20"
          />
          <circle className="plot-splash-ambient plot-splash-ambient-a" cx="256" cy="245" fill="#4F46E5" filter="url(#plotSplashGlow)" opacity="0.25" r="140" />
          <circle className="plot-splash-ambient plot-splash-ambient-b" cx="310" cy="210" fill="#00F2FE" filter="url(#plotSplashGlow)" opacity="0.2" r="90" />

          <g className="plot-splash-float">
            <path d="M 175 110 C 175 96 186 85 200 85 L 320 85 C 334 85 345 96 345 110 L 345 355 C 345 369 334 380 320 380 L 200 380 C 186 380 175 369 175 355 Z" fill="#1E293B" opacity="0.85" stroke="#334155" strokeWidth="2.5" transform="rotate(7 260 235)" />
            <rect fill="#0F172A" filter="url(#plotSplashGlow)" height="300" rx="28" stroke="#38BDF8" strokeOpacity="0.4" strokeWidth="2" width="222" x="145" y="95" />
            <path d="M 146 115 C 146 102 156 96 170 96 L 342 96 C 356 96 366 102 366 115 L 366 210 L 146 250 Z" fill="#FFFFFF" opacity="0.04" />
            <line className="plot-splash-line plot-splash-line-a" stroke="#38BDF8" strokeLinecap="round" strokeWidth="5" x1="180" x2="245" y1="135" y2="135" />
            <line className="plot-splash-line plot-splash-line-b" stroke="#818CF8" strokeLinecap="round" strokeWidth="4.5" x1="180" x2="225" y1="152" y2="152" />

            <g className="plot-splash-ribbon">
              <path d="M 175 345 L 255 245 L 305 345 L 260 345 L 230 295 L 202 345 Z" fill="url(#plotSplashViolet)" filter="url(#plotSplashIntense)" />
              <path d="M 175 200 C 175 160 196 142 225 142 L 295 142 C 330 142 355 166 355 202 C 355 236 328 260 290 260 L 238 260 L 210 292 L 175 292 L 210 252 C 190 244 175 222 175 200 Z" fill="url(#plotSplashCyan)" filter="url(#plotSplashIntense)" />
              <path d="M 225 174 L 288 174 C 308 174 320 186 320 202 C 320 218 308 228 288 228 L 225 228 Z" fill="#0F172A" />
              <rect fill="#38BDF8" height="5" opacity="0.8" rx="2.5" width="46" x="236" y="192" />
              <rect fill="#A855F7" height="5" opacity="0.8" rx="2.5" width="30" x="236" y="206" />
            </g>

            <path className="plot-splash-sparkle plot-splash-sparkle-a" d="M 375 155 Q 375 175 395 175 Q 375 175 375 195 Q 375 175 355 175 Q 375 175 375 155 Z" fill="url(#plotSplashSparkle)" filter="url(#plotSplashIntense)" />
            <path className="plot-splash-sparkle plot-splash-sparkle-b" d="M 155 335 Q 155 345 165 345 Q 155 345 155 355 Q 155 345 145 345 Q 155 345 155 335 Z" fill="#38BDF8" opacity="0.8" />
          </g>

          <path d="M 50 65 Q 256 30 462 65" fill="none" stroke="rgba(255,255,255,0.22)" strokeLinecap="round" strokeWidth="2" />
        </svg>

        <div className="plot-splash-brand">
          <div className="plot-splash-name">
            Plot <span>Docs</span>
          </div>
          <div className="plot-splash-by">BY PLOTXYZ.AI</div>
        </div>
        <div className="plot-splash-tagline">Think it. Write it. Ship it.</div>

        <div className="plot-splash-progress" aria-hidden="true">
          <span style={{ width: `${Math.max(1.5, progress)}%` }} />
        </div>
        <div className="plot-splash-status" aria-live="polite">
          <span>{progress >= 100 ? 'Welcome to Plot Docs' : phaseFor(progress)}</span>
          <span className="plot-splash-percent">{Math.round(progress)}%</span>
        </div>
      </div>

      <div className="plot-splash-corner plot-splash-corner-tl" aria-hidden="true" />
      <div className="plot-splash-corner plot-splash-corner-br" aria-hidden="true" />
    </div>
  )
}
