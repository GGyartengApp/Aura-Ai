import { useState } from 'react'

function snippet(text, q) {
  const i = text.toLowerCase().indexOf(q)
  if (i < 0) return text.slice(0, 90)
  const s = Math.max(0, i - 30)
  return (s ? '…' : '') + text.slice(s, i + q.length + 60)
}

export default function Search({ chats, openChat }) {
  const [q, setQ] = useState('')
  const needle = q.trim().toLowerCase()
  const results = needle
    ? chats
        .map((c) => {
          const hit = c.messages.find((m) => m.content?.toLowerCase().includes(needle))
          const inTitle = c.title.toLowerCase().includes(needle)
          return hit || inTitle ? { c, text: hit ? snippet(hit.content, needle) : c.title } : null
        })
        .filter(Boolean)
        .sort((a, b) => b.c.updated - a.c.updated)
        .slice(0, 30)
    : []

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Search</h1>
          <p>Find anything from your past chats.</p>
        </div>
      </div>
      <input className="in big" autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your chats" aria-label="Search chats" />
      {needle && results.length === 0 && <p className="muted">No chats match “{q.trim()}”.</p>}
      <div className="stu-list">
        {results.map(({ c, text }) => (
          <button key={c.id} className="stu glass res" onClick={() => openChat(c.id)}>
            <strong>{c.title}</strong>
            <small>{text}</small>
          </button>
        ))}
      </div>
    </div>
  )
}
