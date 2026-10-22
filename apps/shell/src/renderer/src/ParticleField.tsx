import { useEffect, useRef } from 'react'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  radius: number
  phase: number
  violet: boolean
}

/**
 * Ambient constellation behind Home. Deliberately lightweight: ~60 drifting
 * points, proximity lines and a violet/cyan bloom, paused for reduced motion.
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext('2d')
    if (!context) return
    const ctx = context

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let frame = 0
    let last = performance.now()
    let dark = document.documentElement.getAttribute('data-color-mode') !== 'light'
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const seed = (): void => {
      const count = Math.min(72, Math.max(26, Math.round((width * height) / 24000)))
      particles = Array.from({ length: count }, (_, index) => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.13,
        vy: -0.05 - Math.random() * 0.12,
        radius: 0.75 + Math.random() * 1.75,
        phase: Math.random() * Math.PI * 2,
        violet: index % 3 !== 1,
      }))
    }

    const resize = (): void => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
      if (reduced) draw(performance.now())
    }

    const draw = (time: number): void => {
      const elapsed = Math.min(40, time - last)
      last = time
      ctx.clearRect(0, 0, width, height)
      if (!width || !height) return
      ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over'

      const pointColor = (particle: Particle, alpha: number): string => {
        if (dark) {
          return particle.violet
            ? `rgba(167, 139, 250, ${alpha})`
            : `rgba(103, 232, 249, ${alpha})`
        }
        return particle.violet
          ? `rgba(109, 40, 217, ${alpha * 0.72})`
          : `rgba(8, 145, 178, ${alpha * 0.62})`
      }

      for (const particle of particles) {
        if (!reduced) {
          particle.x += particle.vx * (elapsed / 16.67)
          particle.y += particle.vy * (elapsed / 16.67)
          if (particle.x < -8) particle.x = width + 8
          if (particle.x > width + 8) particle.x = -8
          if (particle.y < -8) {
            particle.y = height + 8
            particle.x = Math.random() * width
          }
        }

        const pulse = 0.55 + Math.sin(time / 900 + particle.phase) * 0.28
        const alpha = dark ? pulse * 0.68 : pulse * 0.5
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        ctx.fillStyle = pointColor(particle, alpha)
        ctx.shadowBlur = dark ? 12 : 6
        ctx.shadowColor = particle.violet ? 'rgba(139, 92, 246, 0.55)' : 'rgba(34, 211, 238, 0.4)'
        ctx.fill()
        ctx.shadowBlur = 0
      }

      // Delicate constellation mesh between nearby points.
      const maxDistance = 126
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const a = particles[i]!
          const b = particles[j]!
          const dx = a.x - b.x
          const dy = a.y - b.y
          const distance = Math.hypot(dx, dy)
          if (distance >= maxDistance) continue
          const alpha = (1 - distance / maxDistance) * (dark ? 0.14 : 0.08)
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(b.x, b.y)
          ctx.strokeStyle = dark
            ? `rgba(139, 92, 246, ${alpha})`
            : `rgba(109, 40, 217, ${alpha})`
          ctx.lineWidth = 0.65
          ctx.stroke()
        }
      }
      ctx.globalCompositeOperation = 'source-over'
    }

    const tick = (time: number): void => {
      draw(time)
      frame = window.requestAnimationFrame(tick)
    }

    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    resize()

    const themeObserver = new MutationObserver(() => {
      dark = document.documentElement.getAttribute('data-color-mode') !== 'light'
      if (reduced) draw(performance.now())
    })
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-color-mode'],
    })

    if (!reduced) frame = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(frame)
      observer.disconnect()
      themeObserver.disconnect()
    }
  }, [])

  return <canvas className="home-particles" ref={canvasRef} aria-hidden="true" />
}
