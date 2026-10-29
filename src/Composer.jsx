import Icon from './Icon.jsx'

const MODES = ['Chat', 'Deep think']

export default function Composer({ text, setText, onSend, busy, mode, setMode, models, modelId, onModel, onHistory, ctxAvail, ctxOn, onCtx }) {
  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }
  return (
    <div className="composer glass">
      <div className="comp-top">
        <div className="seg">
          {MODES.map((m) => (
            <button key={m} className={m === mode ? 'on' : ''} onClick={() => setMode(m)}>{m}</button>
          ))}
        </div>
        <div className="comp-right">
          <button className="round" aria-label="Messages" onClick={onHistory}><Icon name="history" size={16} /></button>
          <select className="pick" value={modelId || ''} onChange={(e) => onModel(e.target.value)} aria-label="Model" disabled={!models.length}>
            {models.length === 0 && <option value="">No models (start the server)</option>}
            {models.map((m) => (
              <option key={m.id} value={m.id}>{m.label} · {m.provider}{m.paid ? ' · paid' : ''}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="comp-body">
        <span className="spark"><Icon name="spark" size={16} /></span>
        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKey}
          placeholder="Write whatever you want here"
          aria-label="Message"
        />
      </div>
      <div className="comp-foot">
        <div className="comp-left">
          <button className="round" aria-label="Attach link"><Icon name="link" size={16} /></button>
          {ctxAvail && (
            <button className={`chip ${ctxOn ? 'on' : ''}`} onClick={onCtx} aria-pressed={ctxOn} title="Let Aura see your grade book">
              Grades {ctxOn ? 'on' : 'off'}
            </button>
          )}
        </div>
        <button className="go" onClick={onSend} disabled={!text.trim() || busy}>
          <Icon name="send" size={16} /> Send
        </button>
      </div>
    </div>
  )
}
