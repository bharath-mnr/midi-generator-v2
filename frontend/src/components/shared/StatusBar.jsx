// //E:\pro\midigenerator_v2\frontend\src\components\shared\StatusBar.jsx

import { Check, AlertTri, Activity } from './Icons.jsx'

export default function StatusBar({ status, message }) {
  if (!status) return null
  const cfg = {
    ok:      { bg: 'rgba(184,245,74,0.07)',  border: 'rgba(184,245,74,0.25)', color: 'var(--lime)', Icon: Check },
    error:   { bg: 'rgba(245,85,74,0.07)',   border: 'rgba(245,85,74,0.25)',  color: 'var(--rose)', Icon: AlertTri },
    loading: { bg: 'rgba(74,184,245,0.07)',  border: 'rgba(74,184,245,0.25)', color: 'var(--sky)',  Icon: Activity },
  }[status] || { bg: 'var(--card)', border: 'var(--line)', color: 'var(--tx-2)', Icon: Check }

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '9px 13px',
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 8,
      fontSize: 12, color: cfg.color, fontFamily: 'var(--mono)',
    }}>
      <cfg.Icon size={13} stroke={cfg.color} />
      {message}
    </div>
  )
}