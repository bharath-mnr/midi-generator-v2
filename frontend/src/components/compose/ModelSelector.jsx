// frontend/src/components/compose/ModelSelector.jsx
// Two-button pill toggle: Aria (Gemini, fast) / Opus (Claude, best)
// Drop it into the Compose input bar — sits between the attach button and textarea

export default function ModelSelector({ model, onChange, disabled }) {
  const MODELS = [
    {
      id:    'aria',
      label: 'Aria',
      badge: 'FAST',
      tip:   'Gemini — quick generations',
      dot:   '#60d5f5',
      tint:  'rgba(74,184,245,0.13)',
      line:  'rgba(74,184,245,0.3)',
      text:  'var(--sky)',
    },
    {
      id:    'opus',
      label: 'Opus',
      badge: 'PRO',
      tip:   'Claude — best quality',
      dot:   '#a78bfa',
      tint:  'rgba(124,58,237,0.13)',
      line:  'rgba(124,58,237,0.32)',
      text:  '#a78bfa',
    },
  ]

  return (
    <div
      title="Switch AI model"
      style={{
        display: 'flex',
        background: 'var(--raised)',
        border: '1px solid var(--line)',
        borderRadius: 10,
        padding: 3,
        gap: 2,
        flexShrink: 0,
      }}
    >
      {MODELS.map(m => {
        const active = model === m.id
        return (
          <button
            key={m.id}
            onClick={() => !disabled && onChange(m.id)}
            disabled={disabled}
            title={m.tip}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '5px 10px',
              borderRadius: 7,
              border:      active ? `1px solid ${m.line}` : '1px solid transparent',
              background:  active ? m.tint : 'transparent',
              cursor:      disabled ? 'not-allowed' : 'pointer',
              opacity:     disabled ? 0.5 : 1,
              transition:  'all 0.14s ease',
            }}
            onMouseEnter={e => { if (!active && !disabled) e.currentTarget.style.background = 'var(--card)' }}
            onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent' }}
          >
            {/* status dot */}
            <div style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background:  active ? m.dot : 'var(--tx-4)',
              boxShadow:   active ? `0 0 6px ${m.dot}` : 'none',
              transition:  'all 0.14s',
            }} />

            {/* label */}
            <span style={{
              fontSize:   11,
              fontWeight: active ? 600 : 400,
              color:      active ? m.text : 'var(--tx-3)',
              fontFamily: 'var(--font)',
              transition: 'color 0.14s',
            }}>
              {m.label}
            </span>

            {/* badge */}
            <span style={{
              fontSize:      8,
              fontWeight:    700,
              letterSpacing: '0.8px',
              fontFamily:    'var(--mono)',
              padding:       '1px 5px',
              borderRadius:  3,
              background:    active ? m.tint : 'transparent',
              border:        active ? `1px solid ${m.line}` : '1px solid transparent',
              color:         active ? m.text : 'var(--tx-4)',
              transition:    'all 0.14s',
            }}>
              {m.badge}
            </span>
          </button>
        )
      })}
    </div>
  )
}