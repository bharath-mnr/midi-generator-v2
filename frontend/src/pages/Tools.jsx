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
    <div className="page-pad" style={{ height: '100%', overflowY: 'auto' }}>
      {/* Tab bar */}
      <div style={{
        display: 'flex', gap: 2,
        background: 'var(--surface2)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r)',
        padding: 4, marginBottom: 18, flexWrap: 'wrap',
      }}>
        {TABS.map(tab => {
          const isActive = active === tab.id
          return (
            <button key={tab.id} onClick={() => setActive(tab.id)} style={{
              flex: 1, minWidth: 100, padding: '7px 10px',
              borderRadius: 'var(--r-sm)',
              border: isActive ? '1px solid var(--border2)' : '1px solid transparent',
              background: isActive ? 'var(--surface)' : 'none',
              color: isActive ? 'var(--text)' : 'var(--text3)',
              fontSize: 12, fontWeight: isActive ? 600 : 400,
              cursor: 'pointer', transition: 'all 0.15s ease',
              textAlign: 'center', whiteSpace: 'nowrap',
            }}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'var(--text2)' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = 'var(--text3)' }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Panel */}
      <div style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-lg)',
        padding: 24,
        animation: 'fadeUp 0.2s ease forwards',
      }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--display)', fontSize: 28, letterSpacing: 1, color: 'var(--text)' }}>
            {current.label.toUpperCase()} CONVERTER
          </div>
        </div>
        <current.Component key={active} />
      </div>
    </div>
  )
}