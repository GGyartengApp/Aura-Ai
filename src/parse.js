// Splits the model's raw text into { steps, answer, thinking }.
// The model is asked to write <steps>...</steps> first, then the answer.
export function parseStream(raw) {
  const clean = raw.replace(/<think>[\s\S]*?(<\/think>|$)/g, '')
  const s = clean.trimStart()
  const toList = (t) =>
    t.split('\n').map((l) => l.replace(/^[\s\-*•\d.)]+/, '').trim()).filter(Boolean)

  if (s.startsWith('<steps>')) {
    const end = s.indexOf('</steps>')
    if (end === -1) return { steps: toList(s.slice(7)), answer: '', thinking: true }
    return { steps: toList(s.slice(7, end)), answer: s.slice(end + 8).trim(), thinking: false }
  }
  if ('<steps>'.startsWith(s)) return { steps: [], answer: '', thinking: true }
  return { steps: [], answer: clean.trim(), thinking: false }
}
