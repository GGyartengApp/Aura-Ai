const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'
const OFFLINE = "Can't reach the server. Start it with: node --env-file=.env server.js"

export async function fetchInfo(refresh = false) {
  try {
    const r = await fetch(`${API}/api/models${refresh ? '?refresh=1' : ''}`)
    return r.ok ? await r.json() : null
  } catch {
    return null
  }
}
export async function fetchModels() {
  return (await fetchInfo())?.models || []
}

// Streams the reply. onText(fullTextSoFar) fires on every chunk, onBy(modelName) once.
export async function streamChat(history, { modelId, mode, context, onText, onBy }) {
  let res
  try {
    res = await fetch(`${API}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: history, mode, modelId, context }),
    })
  } catch {
    throw new Error(OFFLINE)
  }
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.error || `Server error ${res.status}`)
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  let full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const block = buf.slice(0, i)
      buf = buf.slice(i + 2)
      const line = block.split('\n').find((l) => l.startsWith('data:'))
      if (!line) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return full
      let ev
      try { ev = JSON.parse(payload) } catch { continue }
      if (ev.error) throw new Error(ev.error)
      if (ev.by) onBy?.(ev.by)
      if (ev.t) { full += ev.t; onText(full) }
    }
  }
  return full
}
