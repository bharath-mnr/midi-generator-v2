// //E:\pro\midigenerator_v2\frontend\src\components\layout\TopBar.jsx

import { useLocation } from 'react-router-dom'

const META = {
  '/knowledge': { title: 'Knowledge Base', sub: 'RAG context for composition' },
  '/history':   { title: 'History',        sub: 'Past generations' },
  '/tools':     { title: 'Tools',          sub: 'MIDI converters' },
}

export default function TopBar() {
  const { pathname } = useLocation()
  const info = META[pathname]
  if (!info) return null
  return (
    <div style={{
      height: 52, borderBottom: '1px solid var(--line)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 10,
      background: 'var(--surface)', flexShrink: 0,
    }}>
      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--tx-1)', letterSpacing: '-0.1px' }}>{info.title}</span>
      <span style={{ width: 1, height: 14, background: 'var(--line-md)', flexShrink: 0 }} />
      <span style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'var(--mono)' }}>{info.sub}</span>
    </div>
  )
}