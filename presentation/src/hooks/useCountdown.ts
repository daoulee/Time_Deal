import { useState, useEffect } from 'react'

interface CountdownResult {
  formatted: string
  isExpired: boolean
  totalSecondsLeft: number
}

export function useCountdown(expiresAt: Date): CountdownResult {
  const getSecondsLeft = () =>
    Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))

  const [secondsLeft, setSecondsLeft] = useState(getSecondsLeft)

  useEffect(() => {
    if (secondsLeft === 0) return
    const id = setInterval(() => {
      const s = getSecondsLeft()
      setSecondsLeft(s)
      if (s === 0) clearInterval(id)
    }, 1000)
    return () => clearInterval(id)
  }, [expiresAt])

  const h = String(Math.floor(secondsLeft / 3600)).padStart(2, '0')
  const m = String(Math.floor((secondsLeft % 3600) / 60)).padStart(2, '0')
  const s = String(secondsLeft % 60).padStart(2, '0')

  return {
    formatted: `${h}:${m}:${s}`,
    isExpired: secondsLeft === 0,
    totalSecondsLeft: secondsLeft,
  }
}
