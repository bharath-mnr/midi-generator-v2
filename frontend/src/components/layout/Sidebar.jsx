// // // // //E:\pro\midigenerator_v2\frontend\src\components\layout\Sidebar.jsx

import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'

const Ic = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const NAV = [
  { to: '/compose',   label: 'Compose',   d: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
  { to: '/knowledge', label: 'Knowledge', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z' },
  { to: '/history',   label: 'History',   d: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { to: '/tools',     label: 'Tools',     d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <>
      <style>{`
        .sidebar-aside { width: ${collapsed ? 56 : 212}px; min-width: ${collapsed ? 56 : 212}px; }
        @media (max-width: 768px) { .sidebar-aside { display: none !important; } }
      `}</style>

      <aside className="sidebar-aside" style={{
        transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
        background: 'var(--surface)',
        borderRight: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden', flexShrink: 0, height: '100%', zIndex: 10,
      }}>

        {/* ── Header ── */}
        <div style={{
          height: 56, flexShrink: 0,
          display: 'flex', alignItems: 'center',
          // when expanded: logo left + toggle right; when collapsed: toggle centred only
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '0' : '0 12px 0 14px',
          transition: 'padding 0.22s',
        }}>

          {/* Logo + wordmark — hidden when collapsed */}
          {!collapsed && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden', minWidth: 0 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                background: 'var(--lime)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
                  stroke="#0d0f14" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
                </svg>
              </div>
              <div style={{ overflow: 'hidden', minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
                  MidiGen
                </div>
                <div style={{ fontSize: 9, color: 'var(--tx-3)', fontFamily: 'var(--mono)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 1 }}>
                  AI Studio
                </div>
              </div>
            </div>
          )}

          {/* Toggle — centred when collapsed, right-aligned when expanded */}
          <button
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            style={{
              width: 28, height: 28, borderRadius: 7, flexShrink: 0,
              background: 'none', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--tx-3)', transition: 'all 0.12s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--tx-1)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--tx-3)' }}
          >
            {collapsed ? <PanelRightOpen size={15} /> : <PanelRightClose size={15} />}
          </button>
        </div>

        {/* ── Nav ── */}
        <nav style={{
          flex: 1,
          padding: collapsed ? '10px 6px' : '10px 8px',
          display: 'flex', flexDirection: 'column', gap: 1,
          transition: 'padding 0.22s',
        }}>
          {NAV.map(({ to, label, d }) => (
            <NavLink key={to} to={to} style={{ textDecoration: 'none' }} title={collapsed ? label : undefined}>
              {({ isActive }) => (
                <div style={{
                  display: 'flex', alignItems: 'center',
                  gap: collapsed ? 0 : 9,
                  padding: collapsed ? '9px 0' : '9px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 8,
                  color: isActive ? 'var(--tx-1)' : 'var(--tx-3)',
                  background: isActive ? 'var(--card)' : 'transparent',
                  border: `1px solid ${isActive ? 'var(--line-md)' : 'transparent'}`,
                  fontSize: 13, fontWeight: isActive ? 500 : 400,
                  cursor: 'pointer', transition: 'all 0.12s',
                }}
                  onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--tx-2)'; e.currentTarget.style.background = 'var(--raised)' } }}
                  onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--tx-3)'; e.currentTarget.style.background = 'transparent' } }}
                >
                  <span style={{ color: isActive ? 'var(--lime)' : 'inherit', display: 'flex', flexShrink: 0 }}>
                    <Ic d={d} size={15} />
                  </span>
                  {!collapsed && label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* ── Status footer ── */}
        <div style={{
          padding: collapsed ? '12px 0' : '13px 18px',
          borderTop: '1px solid var(--line)',
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-start',
          gap: 7, flexShrink: 0,
          transition: 'padding 0.22s',
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
            background: 'var(--mint)', boxShadow: '0 0 8px var(--mint)',
            animation: 'pulse 3s ease-in-out infinite',
          }} />
          {!collapsed && (
            <span style={{ fontSize: 10, color: 'var(--tx-3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
              connected
            </span>
          )}
        </div>
      </aside>
    </>
  )
}