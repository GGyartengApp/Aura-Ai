import { useEffect, useState } from 'react'
import Icon from './Icon.jsx'
import { fetchInfo } from './api.js'

export default function Connections() {
  const [info, setInfo] = useState(undefined) // undefined = loading, null = server offline
  const load = (refresh) => fetchInfo(refresh).then(setInfo)
  useEffect(() => { load(false) }, [])

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1>Connections</h1>
          <p>Which AI providers Aura can use right now.</p>
        </div>
        <button className="pill glass" onClick={() => load(true)}>Refresh models</button>
      </div>

      {info === undefined && <p className="muted">Checking the server…</p>}
      {info === null && (
        <div className="panel glass">
          <h2>Server is offline</h2>
          <p className="muted">Start it with: node --env-file=.env server.js</p>
        </div>
      )}

      {info && (
        <>
          <div className="stat-grid">
            {info.providers.map((p) => (
              <div key={p.id} className="stat glass">
                <small>{p.name}</small>
                <b className={p.hasKey ? 'ok' : 'bad'}>{p.hasKey ? 'Connected' : 'No key'}</b>
                <em>{info.models.filter((m) => m.provider === p.name).length} models</em>
              </div>
            ))}
          </div>

          {info.providers.map((p) => {
            const list = info.models.filter((m) => m.provider === p.name)
            if (!list.length) return null
            return (
              <section key={p.id} className="panel glass">
                <h2><Icon name="globe" size={16} /> {p.name}</h2>
                <div className="row">
                  {list.map((m) => (
                    <span key={m.id} className="chip static">{m.label} · {m.tier === 'deep' ? 'deep' : 'chat'}{p.id === 'openrouter' ? (m.paid ? ' · paid' : ' · free') : ''}</span>
                  ))}
                </div>
              </section>
            )
          })}

          {info.onlyFree && <p className="note">OPENROUTER_ONLY_FREE is on, so paid OpenRouter models are hidden.</p>}
          {info.paidBlocked && <p className="note">OpenRouter reported no credits, so paid models are paused for a few minutes.</p>}

          <section className="panel glass">
            <h2>Key not working?</h2>
            <ul className="tips">
              <li>In .env the line must not start with #, for example OPENROUTER_API_KEY=sk-or-...</li>
              <li>Restart the server after any change to .env.</li>
              <li>Paid OpenRouter models need credits at openrouter.ai/credits. Free ones work without.</li>
              <li>Add any model with OPENROUTER_MODELS=anthropic/claude-sonnet-4.5 in .env.</li>
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
