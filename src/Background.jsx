import { useEffect, useRef } from 'react'
import gsap from 'gsap'

// Shared background: put <Background /> on every screen for the same look.
export default function Background() {
  const root = useRef(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.blob').forEach((blob) => {
        const drift = () =>
          gsap.to(blob, {
            x: gsap.utils.random(-160, 160),
            y: gsap.utils.random(-140, 140),
            scale: gsap.utils.random(0.85, 1.25),
            rotation: gsap.utils.random(-30, 30),
            duration: gsap.utils.random(14, 22),
            ease: 'sine.inOut',
            onComplete: drift,
          })
        drift()
      })
    }, root)
    return () => ctx.revert()
  }, [])

  return (
    <div className="bg" ref={root} aria-hidden="true">
      <div className="blob b1" />
      <div className="blob b2" />
      <div className="blob b3" />
      <div className="blob b4" />
      <div className="frost" />
      <div className="grain" />
    </div>
  )
}
