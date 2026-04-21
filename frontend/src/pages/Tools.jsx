// frontend/src/pages/Tools.jsx
// Three converter/tool tabs — matches existing design system exactly.
// Tab 1: JSON → MIDI  (JsonToMidi.jsx)
// Tab 2: MIDI → JSON  (MidiToJson.jsx)
// Tab 3: Analyzer     (Analyzer.jsx) ← new

import { useState } from 'react'
import JsonToMidi from '../components/tools/JsonToMidi.jsx'
import MidiToJson from '../components/tools/MidiToJson.jsx'
import Analyzer   from '../components/tools/Analyzer.jsx'

const TABS = [
  {
    id:    'json2midi',
    label: 'JSON → MIDI',
    sub:   'Generate .mid from JSON',
  },
  {
    id:    'midi2json',
    label: 'MIDI → JSON',
    sub:   'Extract compact JSON from .mid',
  },
  {
    id:    'analyzer',
    label: 'Analyzer',
    sub:   'Pattern detection · YAML blueprint',
  },
]

export default function Tools() {
  const [active, setActive] = useState('json2midi')
  const current = TABS.find(t => t.id === active)

  return (
    <div style={{
      height: '100%',
      overflowY: 'auto',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: 20,
    }}>

      {/* ── Tab pills ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 4 }}>
        {TABS.map(t => {
          const on = active === t.id
          return (
            <button
              key={t.id}
              onClick={() => setActive(t.id)}
              style={{
                padding: '6px 14px',
                borderRadius: 'var(--radius-sm)',
                border: on ? '1px solid var(--border2)' : '1px solid transparent',
                background: on ? 'var(--surface2)' : 'transparent',
                color: on ? 'var(--tx-1)' : 'var(--tx-3)',
                fontSize: 11, fontWeight: on ? 600 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
                fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
                letterSpacing: '0.3px',
              }}
              onMouseEnter={e => { if (!on) { e.currentTarget.style.color = 'var(--tx-2)'; e.currentTarget.style.background = 'var(--raised)' } }}
              onMouseLeave={e => { if (!on) { e.currentTarget.style.color = 'var(--tx-3)'; e.currentTarget.style.background = 'transparent' } }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* ── Active panel ─────────────────────────────────────── */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 14, padding: 24,
        animation: 'fadeUp 0.18s ease',
      }}>
        <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--tx-1)', letterSpacing: '-0.2px', marginBottom: 3 }}>
            {current.label}
          </div>
          <div style={{ fontSize: 10, color: 'var(--tx-3)', fontFamily: 'var(--mono)', letterSpacing: '1px', textTransform: 'uppercase' }}>
            {current.sub}
          </div>
        </div>

        {active === 'json2midi' && <JsonToMidi key="j2m" />}
        {active === 'midi2json' && <MidiToJson key="m2j" />}
        {active === 'analyzer'  && <Analyzer   key="ana" />}
      </div>
    </div>
  )
}