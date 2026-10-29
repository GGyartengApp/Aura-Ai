import Icon from './Icon.jsx'
import { HBars, VBars } from './Charts.jsx'
import { atRisk, fmt, letter, overview, studentStats, subjectStats, tone, trendWord } from './stats.js'
import { todayKey } from './store.js'
import { P } from './prompts.js'

const DIST_COLORS = { A: '#7ee0b5', B: '#38bdf8', C: '#6d4cff', D: '#ffb36b', F: '#ff5fa2' }

export default function Dashboard({ chats, records, sessions, go, ask, onSample }) {
  const ov = overview(records)
  const students = studentStats(records)
  const subjects = subjectStats(records)
  const risk = atRisk(students)
  const msgs = chats.reduce((n, c) => n + c.messages.length, 0)

  const week = [...Array(7)].map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const key = todayKey(d.getTime())
    const value = sessions.filter((s) => todayKey(s.ts) === key).reduce((a, s) => a + s.mins, 0)
    return { label: d.toLocaleDateString(undefined, { weekday: 'short' }), value, color: '#6d4cff' }
  })
  const weekMins = week.reduce((a, d) => a + d.value, 0)

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p>Your grades, study time and chats at a glance.</p>
        </div>
        {records.length > 0 && (
          <button className="pill primary" onClick={() => ask(P.cls)}><Icon name="spark" size={15} /> Analyse with Aura</button>
        )}
      </div>

      <div className="stat-grid">
        <div className="stat glass"><small>Class average</small><b>{records.length ? `${fmt(ov.avg)}%` : '-'}</b><em>{records.length ? `Grade ${letter(ov.avg)}` : 'No grades yet'}</em></div>
        <div className="stat glass"><small>Pass rate</small><b>{records.length ? `${fmt(ov.pass)}%` : '-'}</b><em>{records.length ? `${ov.count} scores` : ' '}</em></div>
        <div className="stat glass"><small>Students</small><b>{ov.students}</b><em>{risk.length ? `${risk.length} need attention` : ' '}</em></div>
        <div className="stat glass"><small>Study this week</small><b>{weekMins}m</b><em>Focus timer</em></div>
        <div className="stat glass"><small>Chats</small><b>{chats.length}</b><em>{msgs} messages</em></div>
      </div>

      {records.length === 0 ? (
        <div className="panel glass empty-card">
          <h2><Icon name="layers" size={16} /> No grades yet</h2>
          <p>Add scores in the grade book, paste them from a spreadsheet, or try sample data to see how the dashboard works.</p>
          <div className="row">
            <button className="pill primary" onClick={() => go('grades')}>Open grade book</button>
            <button className="pill glass" onClick={onSample}>Load sample data</button>
          </div>
        </div>
      ) : (
        <>
          <div className="panels">
            <section className="panel glass">
              <h2>Grade distribution</h2>
              <VBars data={Object.entries(ov.dist).map(([k, v]) => ({ label: k, value: v, color: DIST_COLORS[k] }))} />
              <small className="muted">Median {fmt(ov.median)}% · Std dev {fmt(ov.sd)}</small>
            </section>
            <section className="panel glass">
              <h2>Subject averages</h2>
              <HBars data={subjects.map((s) => ({ label: s.name, value: s.avg, color: tone(s.avg) }))} />
            </section>
          </div>

          <div className="panels">
            <section className="panel glass">
              <h2>Needs attention</h2>
              {risk.length === 0 ? <p className="muted">Nobody is below {50}% or dropping fast. Nice.</p> : (
                <ul className="mini">
                  {risk.map((s) => (
                    <li key={s.name}>
                      <button onClick={() => ask(P.student(s.name))}>
                        <span>{s.name}</span>
                        <small>{fmt(s.avg)}% · {trendWord(s.trend)}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="panel glass">
              <h2>Top performers</h2>
              <ul className="mini">
                {students.slice(0, 3).map((s) => (
                  <li key={s.name}>
                    <button onClick={() => ask(P.student(s.name))}>
                      <span>{s.name}</span>
                      <small>{fmt(s.avg)}% · {letter(s.avg)}</small>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}

      <div className="panels">
        <section className="panel glass">
          <h2>Study time, last 7 days</h2>
          <VBars data={week.map((d) => ({ ...d, show: d.value ? `${d.value}m` : '' }))} h={110} />
        </section>
        <section className="panel glass">
          <h2>Ask Aura</h2>
          <div className="col">
            <button className="chip" disabled={!records.length} onClick={() => ask(P.cls)}>Analyse my class</button>
            <button className="chip" disabled={!records.length} onClick={() => ask(P.help)}>Who needs help?</button>
            <button className="chip" disabled={!records.length} onClick={() => ask(P.plan)}>Make a revision plan</button>
            <button className="chip" onClick={() => go('study')}>Open study tools</button>
          </div>
        </section>
      </div>
    </div>
  )
}
