// Tiny chart helpers, no libraries. data = [{ label, value, color?, show? }]
export function VBars({ data, max, h = 130 }) {
  const top = max ?? Math.max(1, ...data.map((d) => d.value))
  return (
    <div className="vbars" style={{ height: h }}>
      {data.map((d) => (
        <div key={d.label} className="vb">
          <span className="vb-val">{d.show ?? Math.round(d.value)}</span>
          <div className="vb-track">
            <div className="vb-bar" style={{ height: `${Math.min(100, (d.value / top) * 100)}%`, background: d.color }} />
          </div>
          <small>{d.label}</small>
        </div>
      ))}
    </div>
  )
}

export function HBars({ data, max = 100 }) {
  return (
    <div className="hbars">
      {data.map((d) => (
        <div key={d.label} className="hb">
          <span className="hb-l">{d.label}</span>
          <div className="hb-track">
            <div className="hb-fill" style={{ width: `${Math.min(100, (d.value / max) * 100)}%`, background: d.color }} />
          </div>
          <b>{Math.round(d.value)}%</b>
        </div>
      ))}
    </div>
  )
}
