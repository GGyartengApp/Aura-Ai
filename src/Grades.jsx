import { useState } from 'react'
import Icon from './Icon.jsx'
import { fmt, letter, overview, parseCsv, sampleRecords, studentStats, tone } from './stats.js'
import { todayKey } from './store.js'
import { P } from './prompts.js'

const blank = () => ({ student: '', subject: '', score: '', max: '100', date: todayKey() })

export default function Grades({ records, setRecords, ask }) {
  const [f, setF] = useState(blank)
  const [note, setNote] = useState('')
  const [csvOpen, setCsvOpen] = useState(false)
  const [csv, setCsv] = useState('')
  const [open, setOpen] = useState(null)
  const students = studentStats(records)
  const ov = overview(records)
  const subjects = [...new Set(records.map((r) => r.subject))]
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))

  function add(e) {
    e.preventDefault()
    const score = parseFloat(f.score)
    const max = parseFloat(f.max)
    if (!f.student.trim() || !f.subject.trim()) return setNote('Enter a student name and a subject.')
    if (!(score >= 0) || !(max > 0)) return setNote('Score and max must be numbers.')
    if (score > max) return setNote('The score cannot be higher than the max.')
    setNote('')
    setRecords((r) => [...r, { id: crypto.randomUUID(), student: f.student.trim(), subject: f.subject.trim(), score, max, date: f.date || todayKey() }])
    setF((x) => ({ ...x, score: '' }))
  }
  function importCsv() {
    const { rows, skipped } = parseCsv(csv)
    if (!rows.length) return setNote('No valid rows found. Use: student, subject, score, max, date')
    setRecords((r) => [...r, ...rows])
    setCsv('')
    setCsvOpen(false)
    setNote(`Imported ${rows.length} scores${skipped ? `, skipped ${skipped} bad rows` : ''}.`)
  }
  const remove = (id) => setRecords((r) => r.filter((x) => x.id !== id))
  function clearAll() {
    if (window.confirm('Delete every grade in the grade book?')) { setRecords([]); setOpen(null) }
  }

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Grade book</h1>
          <p>Add scores, then let Aura analyse them.</p>
        </div>
        <div className="row">
          {records.length > 0 && (
            <button className="pill primary" onClick={() => ask(P.cls)}><Icon name="spark" size={15} /> Analyse with Aura</button>
          )}
          <button className="pill glass" onClick={() => setCsvOpen((o) => !o)}>Paste scores</button>
          <button className="pill glass" onClick={() => { setRecords((r) => [...r, ...sampleRecords()]); setNote('Sample data added.') }}>Sample data</button>
          {records.length > 0 && <button className="pill glass" onClick={clearAll}>Clear all</button>}
        </div>
      </div>

      <form className="panel glass form" onSubmit={add}>
        <input className="in" list="stu-list" placeholder="Student" value={f.student} onChange={set('student')} aria-label="Student" />
        <input className="in" list="sub-list" placeholder="Subject" value={f.subject} onChange={set('subject')} aria-label="Subject" />
        <input className="in" type="number" step="any" min="0" placeholder="Score" value={f.score} onChange={set('score')} aria-label="Score" />
        <input className="in" type="number" step="any" min="1" placeholder="Max" value={f.max} onChange={set('max')} aria-label="Max score" />
        <input className="in" type="date" value={f.date} onChange={set('date')} aria-label="Date" />
        <button className="go" type="submit"><Icon name="plus" size={16} /> Add</button>
        <datalist id="stu-list">{students.map((s) => <option key={s.name} value={s.name} />)}</datalist>
        <datalist id="sub-list">{subjects.map((s) => <option key={s} value={s} />)}</datalist>
      </form>

      {csvOpen && (
        <div className="panel glass">
          <small className="muted">One score per line: student, subject, score, max (optional), date (optional). Copy straight from a spreadsheet.</small>
          <textarea className="in" rows={5} value={csv} onChange={(e) => setCsv(e.target.value)} placeholder={'Ava Carter, Maths, 72, 100, 2026-10-20\nLiam Nguyen, Maths, 41'} />
          <div className="row"><button className="pill primary" onClick={importCsv}>Import</button></div>
        </div>
      )}
      {note && <p className="note">{note}</p>}

      {records.length > 0 && (
        <>
          <div className="stat-grid">
            <div className="stat glass"><small>Average</small><b>{fmt(ov.avg)}%</b></div>
            <div className="stat glass"><small>Median</small><b>{fmt(ov.median)}%</b></div>
            <div className="stat glass"><small>Std deviation</small><b>{fmt(ov.sd)}</b></div>
            <div className="stat glass"><small>Pass rate</small><b>{fmt(ov.pass)}%</b></div>
          </div>

          <div className="stu-list">
            {students.map((s) => (
              <div key={s.name} className="stu glass">
                <button className="stu-head" onClick={() => setOpen(open === s.name ? null : s.name)} aria-expanded={open === s.name}>
                  <span className="avatar">{s.name[0]}</span>
                  <span className="stu-name">{s.name}<small>{s.count} scores</small></span>
                  <span className="stu-bar"><i style={{ width: `${Math.min(100, s.avg)}%`, background: tone(s.avg) }} /></span>
                  <b>{fmt(s.avg)}% · {letter(s.avg)}</b>
                  <span className={`trend ${s.trend >= 5 ? 'up' : s.trend <= -5 ? 'down' : ''}`}>{s.trend >= 5 ? '▲' : s.trend <= -5 ? '▼' : '–'}</span>
                </button>
                {open === s.name && (
                  <div className="stu-body">
                    <div className="row">
                      {Object.entries(s.bySubject).map(([k, v]) => <span key={k} className="chip static">{k} {Math.round(v)}%</span>)}
                    </div>
                    <ul className="recs">
                      {[...s.records].reverse().map((r) => (
                        <li key={r.id}>
                          <span>{r.subject}</span>
                          <span>{r.score}/{r.max}</span>
                          <small>{r.date}</small>
                          <button className="x" onClick={() => remove(r.id)} aria-label="Delete score">×</button>
                        </li>
                      ))}
                    </ul>
                    <div className="row">
                      <button className="pill glass" onClick={() => ask(P.student(s.name))}><Icon name="spark" size={14} /> Analyse {s.name}</button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
