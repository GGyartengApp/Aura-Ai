// Grade maths. A record is { id, student, subject, score, max, date }.
export const PASS = 50
export const pct = (r) => (r.max > 0 ? (r.score / r.max) * 100 : 0)
export const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0)
export const median = (a) => {
  if (!a.length) return 0
  const s = [...a].sort((x, y) => x - y)
  const m = s.length >> 1
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
export const stdev = (a) => {
  if (a.length < 2) return 0
  const m = mean(a)
  return Math.sqrt(mean(a.map((x) => (x - m) ** 2)))
}
export const letter = (p) => (p >= 80 ? 'A' : p >= 70 ? 'B' : p >= 60 ? 'C' : p >= 50 ? 'D' : 'F')
export const tone = (p) => (p >= 75 ? '#7ee0b5' : p >= 60 ? '#38bdf8' : p >= 50 ? '#ffb36b' : '#ff5fa2')
export const fmt = (n) => String(Math.round(n * 10) / 10)

function group(records, key) {
  const m = new Map()
  for (const r of records) {
    if (!m.has(r[key])) m.set(r[key], [])
    m.get(r[key]).push(r)
  }
  return m
}

export function studentStats(records) {
  return [...group(records, 'student')]
    .map(([name, rs]) => {
      const sorted = [...rs].sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      const half = Math.floor(sorted.length / 2)
      const trend = sorted.length >= 2 ? mean(sorted.slice(half).map(pct)) - mean(sorted.slice(0, half).map(pct)) : 0
      const bySubject = {}
      for (const [s, srs] of group(rs, 'subject')) bySubject[s] = mean(srs.map(pct))
      return { name, count: rs.length, avg: mean(rs.map(pct)), trend, bySubject, records: sorted }
    })
    .sort((a, b) => b.avg - a.avg)
}

export function subjectStats(records) {
  return [...group(records, 'subject')]
    .map(([name, rs]) => {
      const p = rs.map(pct)
      return { name, count: rs.length, avg: mean(p), pass: (p.filter((x) => x >= PASS).length / p.length) * 100 }
    })
    .sort((a, b) => b.avg - a.avg)
}

export function overview(records) {
  const p = records.map(pct)
  const dist = { A: 0, B: 0, C: 0, D: 0, F: 0 }
  p.forEach((x) => { dist[letter(x)]++ })
  return {
    count: records.length,
    students: new Set(records.map((r) => r.student)).size,
    avg: mean(p), median: median(p), sd: stdev(p),
    pass: p.length ? (p.filter((x) => x >= PASS).length / p.length) * 100 : 0,
    dist,
  }
}

export const atRisk = (students) => students.filter((s) => s.avg < PASS || s.trend <= -10)
export const trendWord = (t) => (t >= 5 ? 'rising' : t <= -5 ? 'falling' : 'steady')

// Compact text version of the grade book that is sent to the AI as context.
export function gradeSummary(records) {
  if (!records.length) return ''
  const ov = overview(records)
  const students = studentStats(records)
  const lines = [
    `Class: ${ov.students} students, ${ov.count} scores. Average ${fmt(ov.avg)}%, median ${fmt(ov.median)}%, std dev ${fmt(ov.sd)}, pass rate (>=${PASS}%) ${fmt(ov.pass)}%.`,
    'Subjects: ' + subjectStats(records).map((s) => `${s.name} ${fmt(s.avg)}% (${s.count} scores, ${fmt(s.pass)}% pass)`).join('; '),
    'Students (average, trend, per subject):',
    ...students.slice(0, 60).map((s) =>
      `- ${s.name}: ${fmt(s.avg)}% ${letter(s.avg)}, ${trendWord(s.trend)} (${s.trend >= 0 ? '+' : ''}${fmt(s.trend)}); ` +
      Object.entries(s.bySubject).map(([k, v]) => `${k} ${Math.round(v)}`).join(', ')),
  ]
  if (students.length > 60) lines.push(`(${students.length - 60} more students not shown)`)
  return lines.join('\n')
}

// Parses pasted rows: student, subject, score, max (optional), date (optional). Commas, tabs or semicolons.
export function parseCsv(text) {
  const rows = []
  let skipped = 0
  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    const [student, subject, score, max, date] = line.split(/[,\t;]/).map((x) => x.trim())
    const sc = parseFloat(score)
    const mx = max ? parseFloat(max) : 100
    if (!student || !subject || !(sc >= 0) || !(mx > 0) || sc > mx) { skipped++; continue }
    rows.push({ id: crypto.randomUUID(), student, subject, score: sc, max: mx, date: date || new Date().toLocaleDateString('en-CA') })
  }
  return { rows, skipped: rows.length ? skipped : 0 }
}

const SAMPLE = {
  'Ava Carter': { Maths: [72, 79], English: [81, 84], Science: [75, 82] },
  'Liam Nguyen': { Maths: [48, 41], English: [60, 57], Science: [52, 45] },
  'Maya Patel': { Maths: [88, 92], English: [79, 85], Science: [91, 94] },
  'Noah Okafor': { Maths: [55, 63], English: [47, 53], Science: [58, 66] },
  'Zoe Rossi': { Maths: [67, 64], English: [90, 93], Science: [62, 60] },
  'Ethan Silva': { Maths: [35, 42], English: [44, 49], Science: [38, 41] },
  'Lena Hoffmann': { Maths: [76, 70], English: [72, 66], Science: [80, 71] },
  'Omar Haddad': { Maths: [61, 69], English: [55, 62], Science: [64, 73] },
}
export function sampleRecords() {
  const dates = ['2026-09-15', '2026-10-20']
  return Object.entries(SAMPLE).flatMap(([student, subs]) =>
    Object.entries(subs).flatMap(([subject, scores]) =>
      scores.map((score, i) => ({ id: crypto.randomUUID(), student, subject, score, max: 100, date: dates[i] }))))
}
