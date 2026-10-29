import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'

// Shows what the AI is doing. Live while thinking, then collapses to "Thought for Ns".
export default function Thinking({ steps, active, secs }) {
  const [open, setOpen] = useState(true)
  useEffect(() => { if (!active) setOpen(false) }, [active])

  return (
    <div className={`think ${active ? 'live' : ''}`}>
      <button className="think-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <span className="think-ic"><Icon name="spark" size={14} /></span>
        {active ? <span className="shimmer">Thinking</span> : <span>Thought for {secs}s</span>}
        {active && <span className="dots" aria-hidden="true"><i /><i /><i /></span>}
        <span className={`chev ${open ? 'up' : ''}`}><Icon name="chevron" size={14} /></span>
      </button>
      {open && steps.length > 0 && (
        <ol className="steps">
          {steps.map((s, i) => {
            const current = active && i === steps.length - 1
            return (
              <li key={i} className={current ? 'cur' : 'done'}>
                <span className="tick">{current ? <i className="spin" /> : '✓'}</span>
                {s}
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
