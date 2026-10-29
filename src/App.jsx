import { useEffect, useMemo, useRef, useState } from 'react'
import Background from './Background.jsx'
import Composer from './Composer.jsx'
import Icon from './Icon.jsx'
import Thinking from './Thinking.jsx'
import Dashboard from './Dashboard.jsx'
import Grades from './Grades.jsx'
import Study from './Study.jsx'
import Search from './Search.jsx'
import Connections from './Connections.jsx'
import { useFocusTimer, useStored } from './store.js'
import { gradeSummary, sampleRecords } from './stats.js'
import { fetchModels, streamChat } from './api.js'
import { parseStream } from './parse.js'

const USER_NAME = 'Streak' // change to the signed-in user's name later
const STORE = 'aura-chats'
const PICK = 'aura-model'
const RAIL = [
  { id: 'chat', icon: 'chat', label: 'Chat' },
  { id: 'dash', icon: 'grid', label: 'Dashboard' },
  { id: 'grades', icon: 'layers', label: 'Grades' },
  { id: 'study', icon: 'file', label: 'Study' },
  { id: 'search', icon: 'search', label: 'Search' },
  { id: 'conn', icon: 'globe', label: 'Connections' },
]

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORE)) || [] } catch { return [] }
}
const loadPick = () => {
  try { return JSON.parse(localStorage.getItem(PICK)) || {} } catch { return {} }
}
const greeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}
function ago(ts) {
  const m = Math.round((Date.now() - ts) / 60000)
  if (m < 1) return 'Just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  if (h < 24) return `${h} hr ago`
  return new Date(ts).toLocaleDateString()
}

export default function App() {
  const [chats, setChats] = useState(load)
  const [activeId, setActiveId] = useState(null)
  const [panel, setPanel] = useState(() => window.matchMedia('(min-width: 721px)').matches)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState('Chat')
  const [models, setModels] = useState([])
  const [picked, setPicked] = useState(loadPick)
  const [live, setLive] = useState(null)
  const [view, setView] = useState('chat')
  const [records, setRecords] = useStored('aura-grades', [])
  const [sessions, setSessions] = useStored('aura-study', [])
  const [useCtx, setUseCtx] = useStored('aura-ctx', true)
  const timer = useFocusTimer((mins) => setSessions((s) => [...s, { ts: Date.now(), mins }]))
  const endRef = useRef(null)

  const sorted = useMemo(() => [...chats].sort((a, b) => b.updated - a.updated), [chats])
  const active = chats.find((c) => c.id === activeId)
  const messages = active?.messages ?? []

  useEffect(() => {
    try { localStorage.setItem(STORE, JSON.stringify(chats)) } catch { /* storage full or blocked */ }
  }, [chats])

  useEffect(() => { fetchModels().then(setModels) }, [])
  useEffect(() => {
    try { localStorage.setItem(PICK, JSON.stringify(picked)) } catch { /* ignore */ }
  }, [picked])
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: live ? 'auto' : 'smooth' })
  }, [messages.length, live])

  const tier = mode === 'Deep think' ? 'deep' : 'fast'
  const tierModels = models.filter((m) => m.tier === tier)
  const modelId = tierModels.some((m) => m.id === picked[tier]) ? picked[tier] : tierModels[0]?.id

  const isMobile = () => !window.matchMedia('(min-width: 721px)').matches
  const append = (id, msg) =>
    setChats((c) => c.map((x) => (x.id === id ? { ...x, messages: [...x.messages, msg], updated: Date.now() } : x)))

  function openChat(id) {
    setView('chat')
    setActiveId(id)
    if (isMobile()) setPanel(false)
  }
  function newChat() {
    setView('chat')
    setActiveId(null)
    setText('')
    if (isMobile()) setPanel(false)
  }
  function removeChat(id) {
    setChats((c) => c.filter((x) => x.id !== id))
    if (id === activeId) setActiveId(null)
  }

  // send() uses the composer text. send(prompt, { fresh, ctx }) sends a ready-made prompt (used by the other tabs).
  async function send(override, opts = {}) {
    const content = (typeof override === 'string' ? override : text).trim()
    if (!content || busy) return
    const userMsg = { role: 'user', content }
    let id = opts.fresh ? null : activeId
    let thread
    if (!id) {
      id = crypto.randomUUID()
      thread = [userMsg]
      setChats((c) => [{ id, title: content.slice(0, 40), messages: thread, updated: Date.now() }, ...c])
      setActiveId(id)
    } else {
      thread = [...messages, userMsg]
      setChats((c) => c.map((x) => (x.id === id ? { ...x, messages: thread, updated: Date.now() } : x)))
    }
    if (typeof override !== 'string') setText('')
    setBusy(true)
    const t0 = Date.now()
    let thinkSecs = 0
    let by = ''
    let latest = { steps: [], answer: '', thinking: true }
    setLive(latest)
    const commit = () => {
      if (latest.answer) append(id, { role: 'assistant', content: latest.answer, steps: latest.steps, secs: thinkSecs || 1, by })
    }
    try {
      await streamChat(thread.filter((m) => m.role !== 'error').map((m) => ({ role: m.role, content: m.content })), {
        modelId,
        mode,
        context: (opts.ctx || useCtx) && records.length ? gradeSummary(records) : '',
        onBy: (name) => { by = name },
        onText: (raw) => {
          const p = parseStream(raw)
          if (!p.thinking && !thinkSecs && p.steps.length) thinkSecs = Math.max(1, Math.round((Date.now() - t0) / 1000))
          latest = { ...p, secs: thinkSecs }
          setLive(latest)
        },
      })
      if (!latest.answer) append(id, { role: 'error', content: 'The AI sent an empty reply. Try again.' })
      else commit()
    } catch (e) {
      commit()
      append(id, { role: 'error', content: e.message || 'Something went wrong.' })
    } finally {
      setLive(null)
      setBusy(false)
    }
  }

  const ask = (prompt) => {
    setView('chat')
    send(prompt, { fresh: true, ctx: true })
  }

  const composer = (
    <Composer text={text} setText={setText} onSend={send} busy={busy}
      mode={mode} setMode={setMode} models={tierModels} modelId={modelId}
      onModel={(v) => setPicked((p) => ({ ...p, [tier]: v }))}
      onHistory={() => setPanel((p) => !p)}
      ctxAvail={records.length > 0} ctxOn={useCtx} onCtx={() => setUseCtx((v) => !v)} />
  )

  return (
    <div className="shell">
      <Background />
      <aside className="rail glass">
        <div className="logo"><Icon name="spark" size={18} /></div>
        {RAIL.map((n) => (
          <button key={n.id} className={`rail-btn ${view === n.id ? 'on' : ''}`} aria-label={n.label} title={n.label}
            onClick={() => (n.id === 'chat' && view === 'chat' ? setPanel((p) => !p) : setView(n.id))}>
            <Icon name={n.icon} />
            <span className="rail-lbl">{n.label}</span>
          </button>
        ))}
      </aside>

      <aside className={`history glass ${panel && view === 'chat' ? 'open' : ''}`}>
        <div className="h-top">
          <strong>Messages</strong>
          <button className="round" onClick={newChat} aria-label="New chat"><Icon name="plus" size={16} /></button>
        </div>
        {sorted.length === 0 ? (
          <p className="empty">No chats yet. Send a message to start one.</p>
        ) : (
          <ul>
            {sorted.map((c) => (
              <li key={c.id} className={c.id === activeId ? 'on' : ''}>
                <button className="item" onClick={() => openChat(c.id)}>
                  <span>{c.title}</span>
                  <small>{ago(c.updated)}</small>
                </button>
                <button className="del" onClick={() => removeChat(c.id)} aria-label={`Delete ${c.title}`}>×</button>
              </li>
            ))}
          </ul>
        )}
      </aside>

      <main className="main">
        <header className="top">
          <div className="top-left">
            <button className="pill glass">
              <span className="avatar">{USER_NAME[0]}</span> {USER_NAME} <Icon name="chevron" size={14} />
            </button>
            <button className="pill glass only-m" onClick={() => { setView('chat'); setPanel(true) }}>
              <Icon name="chat" size={15} /> Messages
            </button>
          </div>
          <div className="top-right">
            <button className="pill primary" onClick={newChat}><Icon name="plus" size={15} /> New chat</button>
          </div>
        </header>

        {view === 'dash' ? (
          <Dashboard chats={chats} records={records} sessions={sessions} go={setView} ask={ask}
            onSample={() => setRecords((r) => [...r, ...sampleRecords()])} />
        ) : view === 'grades' ? (
          <Grades records={records} setRecords={setRecords} ask={ask} />
        ) : view === 'study' ? (
          <Study records={records} timer={timer} sessions={sessions} ask={ask} />
        ) : view === 'search' ? (
          <Search chats={chats} openChat={openChat} />
        ) : view === 'conn' ? (
          <Connections />
        ) : messages.length === 0 ? (
          <div className="home">
            <section className="hero">
              <h1>{greeting()}, <span>{USER_NAME}</span></h1>
              <p>Ask anything to get started.</p>
              {composer}
            </section>
            {sorted.length > 0 && (
              <section className="recent">
                <h2><Icon name="file" size={16} /> Recent chats</h2>
                <div className="cards">
                  {sorted.slice(0, 4).map((c) => (
                    <button key={c.id} className="card glass" onClick={() => openChat(c.id)}>
                      <div className="thumb" />
                      <strong>{c.title}</strong>
                      <small>{ago(c.updated)}</small>
                    </button>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="room">
            <section className="chat">
              {messages.map((m, i) =>
                m.role === 'assistant' ? (
                  <div key={i} className="turn">
                    {m.steps?.length > 0 && <Thinking steps={m.steps} active={false} secs={m.secs || 1} />}
                    <div className="msg glass assistant">{m.content}</div>
                    {m.by && <small className="by">{m.by}</small>}
                  </div>
                ) : (
                  <div key={i} className={`msg glass ${m.role}`}>{m.content}</div>
                ),
              )}
              {live && (
                <div className="turn">
                  {(live.thinking || live.steps.length > 0) && (
                    <Thinking steps={live.steps} active={live.thinking} secs={live.secs || 1} />
                  )}
                  {live.answer && <div className="msg glass assistant">{live.answer}</div>}
                </div>
              )}
              <div ref={endRef} />
            </section>
            {composer}
          </div>
        )}
      </main>
    </div>
  )
}
