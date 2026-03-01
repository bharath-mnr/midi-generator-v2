//E:\pro\midigenerator_v2\frontend\src\components\shared\Button.jsx


export default function Button({ children, variant = 'primary', size = 'md', disabled, onClick, style, ...rest }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    gap: 6, border: 'none', cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: 'var(--font)', fontWeight: 700,
    transition: 'all 0.15s ease', borderRadius: 'var(--radius-sm)',
    opacity: disabled ? 0.5 : 1,
  }

  const sizes = {
    sm: { padding: '6px 12px', fontSize: 11 },
    md: { padding: '10px 20px', fontSize: 13 },
    lg: { padding: '12px 24px', fontSize: 14 },
  }

  const variants = {
    primary: {
      background: 'var(--accent)', color: '#000',
    },
    ghost: {
      background: 'none', color: 'var(--text2)',
      border: '1px solid var(--border)',
    },
    danger: {
      background: 'rgba(240,96,96,0.1)', color: 'var(--danger)',
      border: '1px solid rgba(240,96,96,0.2)',
    },
  }

  return (
    <button
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}
