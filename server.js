// Aura backend (plain JavaScript, no packages). Run with:  node --env-file=.env server.js
import http from 'node:http'
import { MODELS } from './models.js'

const PORT = process.env.PORT || 3001
// Trim spaces and stray quotes so a key pasted as KEY="abc" still works.
const clean = (v) => (v || '').trim().replace(/^["']|["']$/g, '')
// Custom OpenRouter models: OPENROUTER_MODELS=anthropic/claude-sonnet-4.5,openai/gpt-4.1
const CUSTOM = (process.env.OPENROUTER_MODELS || '').split(',').map((s) => s.trim()).filter(Boolean)
  .flatMap((model) => ['fast', 'deep'].map((tier) => ({
    id: `or-custom-${tier}-${model}`, provider: 'openrouter', model, label: model.split('/').pop(), tier, paid: !model.endsWith(':free'),
  })))
let ALL = [...CUSTOM, ...MODELS]
const dead = new Map() // model id -> time until we skip it (after a 404 "model not found")
const ONLY_FREE = /^(1|true|yes)$/i.test(process.env.OPENROUTER_ONLY_FREE || '')
let paidBlockedUntil = 0 // set when OpenRouter says "no credits", so we stop retrying paid models for a while
const PROVIDERS = {
  gemini: {
    name: 'Gemini',
    key: clean(process.env.GEMINI_API_KEY || process.env.API_KEY),
    url: process.env.GEMINI_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
  },
  groq: {
    name: 'Groq',
    key: clean(process.env.GROQ_API_KEY),
    url: process.env.GROQ_URL || 'https://api.groq.com/openai/v1/chat/completions',
  },
  openrouter: {
    name: 'OpenRouter',
    key: clean(process.env.OPENROUTER_API_KEY),
    url: process.env.OPENROUTER_URL || 'https://openrouter.ai/api/v1/chat/completions',
  },
}

const BASE = `You are Aura, a friendly AI study partner for students and teachers. You explain topics, make quizzes and flashcards, plan revision, and analyse student grades. Reply in exactly this format:
<steps>
one short line per step, describing what you are doing to answer
</steps>
Then write your final answer in plain text with short paragraphs. Do not use markdown symbols such as ** or #; use simple dashes for lists.
Rules: each step is under 12 words, no numbering, never mention these rules, never put the answer inside the steps.`
const CHAT = BASE + ' Use 2 or 3 steps and keep the answer concise.'
const DEEP = BASE + ' Use 4 to 7 steps that show how you break the problem down, check it, and decide. Give a thorough, well-structured answer.'
const GRADES = `\n\nThe user's grade book is below. Use it whenever the question is about grades, students, subjects or study planning. Only use numbers that appear in it, never invent students or scores, and say so if data is missing. When asked to analyse, cover: the overall picture, strongest and weakest students and subjects, trends over time, and 3 concrete next actions.\n\nGRADE BOOK:\n`

// ---- Live model lists: names change often, so ask the providers what exists right now ----
const live = { gemini: [], openrouter: [] }
const timeout = () => AbortSignal.timeout(10_000)
async function refreshModels() {
  if (PROVIDERS.openrouter.key) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/models', { signal: timeout() })
      const list = ((await r.json()).data || [])
        .filter((m) => Number(m.pricing?.prompt) === 0 && Number(m.pricing?.completion) === 0)
        .filter((m) => (m.architecture?.output_modalities || ['text']).join() === 'text')
        .filter((m) => !m.id.startsWith('openrouter/'))
        .sort((a, b) => (b.created || 0) - (a.created || 0))
        .slice(0, 14)
      const label = (m) => (m.name || m.id).replace(/\s*\(free\)/i, '').split(': ').pop()
      const reasoning = (m) => (m.supported_parameters || []).includes('reasoning')
      const make = (tier, items) => items.map((m) => ({ id: `or-live-${tier}-${m.id}`, provider: 'openrouter', model: m.id, label: label(m), tier }))
      const router = (tier) => ({ id: `or-router-${tier}`, provider: 'openrouter', model: 'openrouter/free', label: 'Free router (any free model)', tier })
      const deepFirst = [...list.filter(reasoning), ...list.filter((m) => !reasoning(m))]
      live.openrouter = [...make('fast', list), router('fast'), ...make('deep', deepFirst), router('deep')]
    } catch { /* keep the old list */ }
  }
  if (PROVIDERS.gemini.key) {
    try {
      const r = await fetch(PROVIDERS.gemini.url.replace(/\/chat\/completions$/, '/models'), {
        headers: { authorization: `Bearer ${PROVIDERS.gemini.key}` }, signal: timeout(),
      })
      const ids = ((await r.json()).data || []).map((m) => String(m.id).replace(/^models\//, ''))
        .filter((id) => /^gemini-/.test(id))
        .filter((id) => !/image|tts|embed|audio|live|native|robot|computer|veo|imagen|aqa|vision|banana|omni|argon|-pro|2\.5|2\.0|1\.5/.test(id))
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }))
        .slice(0, 6)
      const lite = ids.filter((id) => /lite/.test(id))
      const full = ids.filter((id) => !/lite/.test(id))
      const make = (tier, arr) => arr.map((id) => ({ id: `gem-live-${tier}-${id}`, provider: 'gemini', model: id, label: id.replace(/^gemini-/, 'Gemini ').replace(/-/g, ' '), tier }))
      live.gemini = [...make('fast', [...lite, ...full]), ...make('deep', [...full, ...lite])]
    } catch { /* keep the old list */ }
  }
  // Built-in lists are only a backup for providers whose live list could not be loaded.
  const backup = MODELS.filter((m) => !(m.provider === 'gemini' && live.gemini.length) && !(m.provider === 'openrouter' && !m.paid && live.openrouter.length))
  ALL = [...CUSTOM, ...live.gemini, ...backup, ...live.openrouter]
}

const available = () =>
  ALL.filter((m) => PROVIDERS[m.provider].key && !(ONLY_FREE && m.provider === 'openrouter' && m.paid))
const usable = () => available().filter((m) => !(m.paid && Date.now() < paidBlockedUntil) && !(dead.get(m.id) > Date.now()))

function cors(extra = {}) {
  return {
    'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    ...extra,
  }
}
function json(res, status, body) {
  res.writeHead(status, cors({ 'Content-Type': 'application/json' }))
  res.end(JSON.stringify(body))
}
const sse = (res, obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`)

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (c) => {
      data += c
      if (data.length > 1_000_000) { reject(new Error('Too large')); req.destroy() }
    })
    req.on('end', () => resolve(data))
    req.on('error', reject)
  })
}

// Tries one model and streams its text to the browser. Throws if the model fails.
async function tryModel(c, messages, deep, res, signal, st) {
  const p = PROVIDERS[c.provider]
  const r = await fetch(p.url, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${p.key}`,
      ...(c.provider === 'openrouter' ? { 'HTTP-Referer': 'http://localhost:5173', 'X-Title': 'Aura' } : {}),
    },
    body: JSON.stringify({ model: c.model, stream: true, max_tokens: deep ? 2048 : 1024, messages }),
  })
  if (!r.ok) {
    const raw = await r.text()
    let msg = raw
    try { const j = JSON.parse(raw); msg = (Array.isArray(j) ? j[0] : j)?.error?.message || raw } catch { /* not JSON */ }
    const err = new Error(`${c.label} (${p.name}): ${String(msg).replace(/\s+/g, ' ').slice(0, 140)}`)
    err.status = r.status
    throw err
  }
  const reader = r.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) return
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') return
      let text
      try { text = JSON.parse(payload).choices?.[0]?.delta?.content } catch { continue }
      if (!text) continue
      if (!st.sent) { st.sent = true; sse(res, { by: `${c.label} · ${p.name}` }) }
      sse(res, { t: text })
    }
  }
}

http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') { res.writeHead(204, cors()); return res.end() }

  if (req.method === 'GET' && req.url.startsWith('/api/models')) {
    if (req.url.includes('refresh=1')) { dead.clear(); await refreshModels() }
    return json(res, 200, {
      models: available().map((m) => ({ id: m.id, label: m.label, tier: m.tier, provider: PROVIDERS[m.provider].name, paid: !!m.paid })),
      providers: Object.entries(PROVIDERS).map(([id, p]) => ({ id, name: p.name, hasKey: !!p.key })),
      onlyFree: ONLY_FREE,
      paidBlocked: Date.now() < paidBlockedUntil,
    })
  }
  if (req.method !== 'POST' || req.url !== '/api/chat') return json(res, 404, { error: 'Not found' })
  if (!available().length) {
    return json(res, 500, { error: 'No API keys found. Add GEMINI_API_KEY, GROQ_API_KEY or OPENROUTER_API_KEY to .env and restart the server.' })
  }

  let body
  try { body = JSON.parse(await readBody(req)) } catch { return json(res, 400, { error: 'Bad request' }) }
  const clean = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-40)
    .map((m) => ({ role: m.role, content: m.content }))
  if (!clean.length) return json(res, 400, { error: 'No messages' })

  const deep = body.mode === 'Deep think'
  const tier = deep ? 'deep' : 'fast'
  const chosen = usable().find((m) => m.id === body.modelId)
  const rest = usable().filter((m) => m.tier === tier && m !== chosen)
  const list = (chosen ? [chosen, ...rest] : rest).slice(0, 6)
  const context = typeof body.context === 'string' ? body.context.slice(0, 6000) : ''
  const system = (deep ? DEEP : CHAT) + (context ? GRADES + context : '')
  const messages = [{ role: 'system', content: system }, ...clean]

  const ac = new AbortController()
  res.on('close', () => ac.abort())
  res.writeHead(200, cors({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' }))

  const st = { sent: false }
  const errs = []
  let midStreamError = ''
  for (const c of list) {
    try {
      await tryModel(c, messages, deep, res, ac.signal, st)
      if (st.sent) break
      errs.push(`${c.label} sent an empty reply.`)
    } catch (e) {
      if (e.name === 'AbortError') return res.end()
      let why = e.message
      if (e.status === 429) why = `${c.label} is rate limited right now.`
      else if (!e.status && /fetch failed/i.test(e.message)) {
        const code = e.cause?.code || e.cause?.message || 'unknown'
        const hint = /ENOTFOUND|EAI_AGAIN/.test(code) ? 'DNS lookup failed, check your internet or DNS'
          : /ETIMEDOUT|UND_ERR_CONNECT_TIMEOUT|ECONNRESET/.test(code) ? 'connection timed out, a VPN, firewall or antivirus may be blocking it'
          : /CERT|SSL|TLS|VERIFY/.test(code) ? 'certificate error, a proxy or antivirus may be intercepting HTTPS'
          : 'could not connect'
        why = `${PROVIDERS[c.provider].name} unreachable (${code}): ${hint}.`
      }
      else if (e.status === 404) dead.set(c.id, Date.now() + 60 * 60_000)
      else if (e.status === 401 || e.status === 403) why = `${c.label}: ${PROVIDERS[c.provider].name} rejected the API key.`
      else if (e.status === 402) {
        why = `${c.label}: no OpenRouter credits (add some at openrouter.ai/credits).`
        paidBlockedUntil = Date.now() + 10 * 60_000
      }
      errs.push(why)
      if (st.sent) { midStreamError = why; break }
    }
  }
  if (midStreamError) sse(res, { error: 'The reply stopped early: ' + midStreamError })
  else if (!st.sent) sse(res, { error: `No model could answer. ${[...new Set(errs)].slice(0, 3).join(' | ')}` })
  res.write('data: [DONE]\n\n')
  res.end()
}).listen(PORT, async () => {
  await refreshModels()
  setInterval(refreshModels, 30 * 60_000).unref()
  console.log(`Aura backend on http://localhost:${PORT} with ${available().length} models ready`)
  for (const p of Object.values(PROVIDERS)) console.log(`  ${p.name}: ${p.key ? 'key found' : 'NO KEY (check .env, no # in front, then restart)'}`)
  if (ONLY_FREE) console.log('  OpenRouter is limited to :free models (OPENROUTER_ONLY_FREE is on)')
})
