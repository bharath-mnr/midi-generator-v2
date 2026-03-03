// //E:\pro\midigenerator_v2\frontend\src\pages\Tools.jsx

import { useState } from 'react'
import MidiToText from '../components/tools/MidiToText.jsx'
import TextToMidi from '../components/tools/TextToMidi.jsx'
import MidiToJson from '../components/tools/MidiToJson.jsx'
import JsonToMidi from '../components/tools/JsonToMidi.jsx'
import TextToJson from '../components/tools/TextToJson.jsx'
import JsonToText from '../components/tools/JsonToText.jsx'

const TABS = [
  { id: 'midi-text', label: 'MIDI → Text',  short: 'M→T', Component: MidiToText },
  { id: 'text-midi', label: 'Text → MIDI',  short: 'T→M', Component: TextToMidi },
  { id: 'midi-json', label: 'MIDI → JSON',  short: 'M→J', Component: MidiToJson },
  { id: 'json-midi', label: 'JSON → MIDI',  short: 'J→M', Component: JsonToMidi },
  { id: 'text-json', label: 'Text → JSON',  short: 'T→J', Component: TextToJson },
  { id: 'json-text', label: 'JSON → Text',  short: 'J→T', Component: JsonToText },
]

export default function Tools() {
  const [active, setActive] = useState('midi-text')
  const current = TABS.find(t => t.id === active)

  return (
    <div className="page">
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 3, flexWrap: 'wrap',
        background: 'var(--surface)',
        border: '1px solid var(--line)',
        borderRadius: 12, padding: 4, marginBottom: 20,
      }}>
        {TABS.map(t => {
          const on = active === t.id
          return (
            <button key={t.id} onClick={() => setActive(t.id)} style={{
              flex: 1, minWidth: 86, padding: '8px 6px',
              borderRadius: 9,
              background: on ? 'var(--card)' : 'transparent',
              border: `1px solid ${on ? 'var(--line-md)' : 'transparent'}`,
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

      {/* Converter panel */}
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
            Converter
          </div>
        </div>
        <current.Component key={active} />
      </div>
    </div>
  )
}