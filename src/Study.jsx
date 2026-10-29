import { useState } from 'react'
import Icon from './Icon.jsx'
import { subjectStats } from './stats.js'
import { todayKey } from './store.js'
import { P } from './prompts.js'

const TOOLS = [
  { label: 'Summarise', run: (t) => `Summarise the following into clear key points I can revise quickly:\n\n${t}` },
  { label: 'Quiz me', run: (t) => `Quiz me on the following. Ask ONE question at a time, wait for my answer, tell me if I am right and why, then ask the next. Start with question 1.\n\n${t}` },
  { label: 'Flashcards', run: (t) => `Make 10 flashcards from the following. Write each as "Q: ..." then "A: ...".\n\n${t}` },
  { label: 'Explain simply', run: (t) => `Explain the following in simple words with one everyday example:\n\n${t}` },
  { label: 'Study plan', run: (t, d) => `Build a ${d}-day study plan for this topic, day by day, with short tasks and a quick self-test at the end:\n\n${t}` },
]
const mmss = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

export default function Study({ records, timer, sessions, ask }) {
  const [notes, setNotes] = useState('')
  const [days, setDays] = useState(7)
  const weak = subjectStats(records).slice(-2).reverse()
  const today = sessions.filter((s) => todayKey(s.ts) === todayKey()).reduce((a, s) => a + s.mins, 0)
  const ready = notes.trim().length > 0

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Study</h1>
          <p>Paste notes or type a topic, then pick a tool.</p>
        </div>
      </div>

      <section className="panel glass">
        <textarea className="in" rows={6} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Paste your notes, or type a topic like 'photosynthesis'" aria-label="Notes or topic" />
        <div className="row">
          {TOOLS.map((t) => (
            <button key={t.label} className="chip" disabled={!ready} onClick={() => ask(t.run(notes.trim(), days))}>{t.label}</button>
          ))}
          <label className="days">Plan days
            <input className="in" type="number" min="1" max="60" value={days} onChange={(e) => setDays(Math.max(1, Math.min(60, +e.target.value || 1)))} />
          </label>
        </div>
      </section>

      {weak.length > 0 && (
        <section className="panel glass">
          <h2>From your grades</h2>
          <div className="row">
            {weak.map((s) => (
              <button key={s.name} className="chip" onClick={() => ask(P.subject(s.name, days))}>Raise {s.name} ({Math.round(s.avg)}%)</button>
            ))}
          </div>
        </section>
      )}

      <section className="panel glass timer">
        <h2><Icon name="history" size={16} /> Focus timer</h2>
        <div className="row">
          {[15, 25, 45].map((m) => (
            <button key={m} className={`chip ${timer.mins === m ? 'on' : ''}`} onClick={() => timer.choose(m)} disabled={timer.running}>{m} min</button>
          ))}
        </div>
        <div className="clock">{mmss(timer.left)}</div>
        <div className="row">
          {timer.running
            ? <button className="pill glass" onClick={timer.pause}>Pause</button>
            : <button className="pill primary" onClick={timer.start}>Start</button>}
          <button className="pill glass" onClick={timer.reset}>Reset</button>
        </div>
        <small className="muted">Focused today: {today} min. Finished sessions show up on the dashboard.</small>
      </section>
    </div>
  )
}
