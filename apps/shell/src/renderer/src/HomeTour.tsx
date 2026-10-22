import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { createPortal } from 'react-dom'

interface TourStep {
  selector: string | null
  title: string
  body: string
}

const STEPS: readonly TourStep[] = [
  {
    selector: null,
    title: 'Welcome to Plot Docs',
    body: 'A quick look around your workspace. Use the arrow keys or the buttons below; press Esc anytime to close.',
  },
  {
    selector: '[data-tour="sidebar"]',
    title: 'Everything lives in the rail',
    body: 'Recent files, starred work, Ask Plot AI, your folders and account - all one click away, without taking space from the page.',
  },
  {
    selector: '[data-tour="ai"]',
    title: 'Ask Plot AI from Home',
    body: 'Describe the document, analysis or deck you need. Plot AI can open the right editor, use your files and keep every edit reviewable.',
  },
  {
    selector: '[data-tour="quick-cards"]',
    title: 'Start in one click',
    body: 'Blank files for all six editors, plus Open local for an existing .docx, .xlsx, .pptx, .pdf, .md or .html file.',
  },
  {
    selector: '[data-tour="templates"]',
    title: 'Start from a designed template',
    body: 'Thirteen branded starting points - proposals, reports, budgets, forecasts, decks, briefs and landing pages. Pick one and make it yours.',
  },
  {
    selector: '[data-tour="recents"]',
    title: 'Pick up where you left off',
    body: 'Your recent files, starred items and folders, with filters for every format. Select a row for move, delete and star actions.',
  },
  {
    selector: '[data-tour="search"]',
    title: 'Search inside the files',
    body: 'Search names, folders and indexed content from one box. Plot can optionally rerank the results with the model you choose.',
  },
  {
    selector: '[data-tour="account"]',
    title: 'Account, AI and appearance',
    body: 'Sign in, manage providers and models, switch the theme or set the default save folder. Everything is stored on this machine.',
  },
]

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

interface HomeTourProps {
  open: boolean
  onClose: () => void
}

const TOOLTIP_WIDTH = 380
const TOOLTIP_HEIGHT = 218
const GAP = 16

export function HomeTour({ open, onClose }: HomeTourProps) {
  const [index, setIndex] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const step = STEPS[index]!

  const measure = useCallback(() => {
    if (!step.selector) {
      setRect(null)
      return
    }
    const el = document.querySelector<HTMLElement>(step.selector)
    if (!el) {
      setRect(null)
      return
    }
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) {
      setRect(null)
      return
    }
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
  }, [step.selector])

  useEffect(() => {
    if (!open) return
    setIndex(0)
  }, [open])

  useEffect(() => {
    if (!open) return
    const el = step.selector ? document.querySelector<HTMLElement>(step.selector) : null
    if (el) {
      const r = el.getBoundingClientRect()
      if (r.top < 88 || r.bottom > window.innerHeight - 80) {
        el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      }
    }
    const frame = window.requestAnimationFrame(() => {
      measure()
      window.setTimeout(measure, 320)
    })
    tooltipRef.current?.focus({ preventScroll: true })
    return () => window.cancelAnimationFrame(frame)
  }, [open, index, measure, step.selector])

  useEffect(() => {
    if (!open) return
    const update = () => measure()
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [open, measure])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        setIndex((n) => (n + 1) % STEPS.length)
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setIndex((n) => (n - 1 + STEPS.length) % STEPS.length)
      } else if (event.key === 'Tab') {
        const focusable = tooltipRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        )
        if (!focusable || focusable.length === 0) return
        const first = focusable[0]!
        const last = focusable[focusable.length - 1]!
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const vw = window.innerWidth
  const vh = window.innerHeight
  let tooltipStyle: CSSProperties
  if (!rect) {
    tooltipStyle = {
      left: '50%',
      top: '50%',
      transform: 'translate(-50%, -50%)',
    }
  } else {
    const below = rect.top + rect.height + GAP + TOOLTIP_HEIGHT < vh - 20
    const top = below
      ? rect.top + rect.height + GAP
      : Math.max(20, rect.top - TOOLTIP_HEIGHT - GAP)
    const left = Math.min(
      Math.max(16, rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2),
      Math.max(16, vw - TOOLTIP_WIDTH - 16),
    )
    tooltipStyle = { left, top, width: TOOLTIP_WIDTH }
  }

  const spotlightStyle: CSSProperties | undefined = rect
    ? {
        left: Math.max(0, rect.left - 7),
        top: Math.max(0, rect.top - 7),
        width: rect.width + 14,
        height: rect.height + 14,
      }
    : undefined

  const last = index === STEPS.length - 1

  return createPortal(
    <div className="home-tour" role="presentation">
      <div
        className={`home-tour-scrim${rect ? ' has-spotlight' : ''}`}
        aria-hidden="true"
        onClick={onClose}
      />
      {rect && <div className="home-tour-spotlight" style={spotlightStyle} aria-hidden="true" />}
      <div
        className={`home-tour-card${rect ? ' anchored' : ' centered'}`}
        style={tooltipStyle}
        role="dialog"
        aria-modal="true"
        aria-label={`Plot Docs tour, step ${index + 1} of ${STEPS.length}`}
        tabIndex={-1}
        ref={tooltipRef}
      >
        <div className="home-tour-top">
          <span className="home-tour-kicker">
            <span className="home-tour-spark" aria-hidden="true">
              ?
            </span>
            Guided tour
          </span>
          <span className="home-tour-count">
            {String(index + 1).padStart(2, '0')} / {String(STEPS.length).padStart(2, '0')}
          </span>
          <button className="home-tour-close" onClick={onClose} aria-label="Close tour">
            ×
          </button>
        </div>
        <div className="home-tour-progress" aria-hidden="true">
          <span style={{ width: `${((index + 1) / STEPS.length) * 100}%` }} />
        </div>
        <h2>{step.title}</h2>
        <p>{step.body}</p>
        <div className="home-tour-actions">
          <button
            className="home-tour-skip"
            onClick={() => {
              onClose()
            }}
          >
            {last ? 'Close' : 'Skip tour'}
          </button>
          <div className="home-tour-nav">
            <button
              className="home-tour-back"
              disabled={index === 0}
              onClick={() => setIndex((n) => Math.max(0, n - 1))}
            >
              Back
            </button>
            <button
              className="home-tour-next"
              onClick={() => (last ? onClose() : setIndex((n) => n + 1))}
            >
              {last ? 'Start creating' : 'Next'}
              <span aria-hidden="true">{last ? '?' : '?'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
