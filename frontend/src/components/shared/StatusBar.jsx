//E:\pro\midigenerator_v2\frontend\src\components\shared\StatusBar.jsx

import { Check, AlertTri, Activity } from './Icons.jsx'

export default function StatusBar({ status, message }) {
  if (!status) return null

  const configs = {
    ok: {
      bg: 'rgba(200,240,96,0.05)',
      border: 'rgba(200,240,96,0.15)',
      color: 'var(--accent)',
      Icon: Check,
    },
    error: {
      bg: 'rgba(240,96,96,0.06)',
      border: 'rgba(240,96,96,0.2)',
      color: 'var(--danger)',
      Icon: AlertTri,
    },
    loading: {
      bg: 'rgba(96,200,240,0.05)',
      border: 'rgba(96,200,240,0.15)',
      color: 'var(--accent3)',
      Icon: Activity,
    },
  }

  const cfg = configs[status] || configs.ok

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 14px',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 'var(--radius-sm)',
      fontSize: 12, color: cfg.color,
      fontFamily: 'var(--mono)',
    }}>
      <cfg.Icon size={13} stroke={cfg.color} />
      {message}
    </div>
  )
}
