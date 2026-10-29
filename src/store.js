import { useEffect, useRef, useState } from 'react'

export const todayKey = (ts = Date.now()) => new Date(ts).toLocaleDateString('en-CA')

// Like useState, but saved in localStorage.
export function useStored(key, init) {
  const [v, setV] = useState(() => {
    try {
      const s = localStorage.getItem(key)
      return s ? JSON.parse(s) : init
    } catch { return init }
  })
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* storage full or blocked */ }
  }, [key, v])
  return [v, setV]
}

// Focus timer that keeps running while you switch tabs. onDone(minutes) fires when it finishes.
export function useFocusTimer(onDone) {
  const [mins, setMins] = useState(25)
  const [left, setLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const end = useRef(0)
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone })

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => {
      const l = Math.round((end.current - Date.now()) / 1000)
      if (l <= 0) {
        setRunning(false)
        setLeft(mins * 60)
        done.current?.(mins)
      } else setLeft(l)
    }, 500)
    return () => clearInterval(id)
  }, [running, mins])

  return {
    mins, left, running,
    start: () => { end.current = Date.now() + left * 1000; setRunning(true) },
    pause: () => setRunning(false),
    reset: () => { setRunning(false); setLeft(mins * 60) },
    choose: (m) => { setMins(m); setLeft(m * 60); setRunning(false) },
  }
}
