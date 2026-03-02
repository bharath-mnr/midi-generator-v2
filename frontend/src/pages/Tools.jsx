//E:\pro\midigenerator_v2\frontend\src\pages\Tools.jsx
import { useState } from 'react'
import MidiToText from '../components/tools/MidiToText.jsx'
import TextToMidi from '../components/tools/TextToMidi.jsx'
import MidiToJson from '../components/tools/MidiToJson.jsx'
import JsonToMidi from '../components/tools/JsonToMidi.jsx'
import TextToJson from '../components/tools/TextToJson.jsx'
import JsonToText from '../components/tools/JsonToText.jsx'

const TABS = [
  { id: 'midi-text', label: 'MIDI → Text',  Component: MidiToText },
  { id: 'text-midi', label: 'Text → MIDI',  Component: TextToMidi },
  { id: 'midi-json', label: 'MIDI → JSON',  Component: MidiToJson },
  { id: 'json-midi', label: 'JSON → MIDI',  Component: JsonToMidi },
  { id: 'text-json', label: 'Text → JSON',  Component: TextToJson },
  { id: 'json-text', label: 'JSON → Text',  Component: JsonToText },
]

export default function Tools() {
  const [active, setActive] = useState('midi-text')
  const current = TABS.find(t => t.id === active)

  return (
    <div className="page">
      {/* Tab strip */}
      <div style={{
        display: 'flex', gap: 2, flexWrap: 'wrap',
        background: 'var(--s1)', border: '1px solid var(--b1)',
        borderRadius: 10, padding: 3, marginBottom: 20,
      }}>
        {TABS.map(t => {
          const on = active === t.id
          return (
            <button key={t.id} onClick={() => setActive(t.id)} style={{
              flex: 1, minWidth: 90, padding: '7px 10px',
              borderRadius: 8,
              background: on ? 'var(--s2)' : 'none',
              border: `1px solid ${on ? 'var(--b2)' : 'transparent'}`,
              color: on ? 'var(--t1)' : 'var(--t3)',
              fontSize: 11, fontWeight: on ? 500 : 400,
              cursor: 'pointer', transition: 'all 0.12s',
              fontFamily: 'var(--mono)', whiteSpace: 'nowrap',
              letterSpacing: 0.3,
            }}
              onMouseEnter={e => { if (!on) e.currentTarget.style.color = 'var(--t2)' }}
              onMouseLeave={e => { if (!on) e.currentTarget.style.color = 'var(--t3)' }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div style={{
        background: 'var(--s1)', border: '1px solid var(--b1)',
        borderRadius: 12, padding: 24,
        animation: 'fadeUp 0.18s ease forwards',
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, color: 'var(--t1)' }}>
            {current.label}
          </div>
          <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 4, letterSpacing: 0.5 }}>
            converter
          </div>
        </div>
        <current.Component key={active} />
      </div>
    </div>
  )
}