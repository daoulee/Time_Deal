import { useState, useEffect, useRef, useCallback } from 'react'

export function usePresentation(total: number) {
  const [current, setCurrent] = useState(0)
  const isAnimating = useRef(false)
  const currentRef = useRef(0)
  // Prevent spurious events during page load / browser paint
  const ready = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => { ready.current = true }, 400)
    return () => clearTimeout(t)
  }, [])

  const goTo = useCallback(
    (index: number) => {
      if (isAnimating.current || index === currentRef.current) return
      if (index < 0 || index >= total) return
      isAnimating.current = true
      currentRef.current = index
      setCurrent(index)
      setTimeout(() => { isAnimating.current = false }, 1000)
    },
    [total],
  )

  const navigate = useCallback(
    (delta: number) => { goTo(currentRef.current + delta) },
    [goTo],
  )

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (['Space', 'ArrowDown', 'ArrowRight'].includes(e.code)) {
        e.preventDefault()
        navigate(1)
      }
      if (['ArrowUp', 'ArrowLeft'].includes(e.code)) {
        e.preventDefault()
        navigate(-1)
      }
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      // Block load-time spurious events and trackpad micro-scrolls / inertia tail
      if (!ready.current || Math.abs(e.deltaY) < 30) return
      navigate(e.deltaY > 0 ? 1 : -1)
    }

    let touchStartY = 0
    const onTouchStart = (e: TouchEvent) => { touchStartY = e.touches[0].clientY }
    const onTouchEnd = (e: TouchEvent) => {
      const d = touchStartY - e.changedTouches[0].clientY
      if (Math.abs(d) > 50) navigate(d > 0 ? 1 : -1)
    }

    window.addEventListener('keydown', onKey)
    window.addEventListener('wheel', onWheel, { passive: false })
    window.addEventListener('touchstart', onTouchStart)
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [navigate])

  const getState = (i: number): 'active' | 'above' | 'below' =>
    i === current ? 'active' : i < current ? 'above' : 'below'

  return { current, navigate, goTo, getState, total }
}
