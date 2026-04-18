// // frontend/src/components/tools/JsonToMidi.jsx
// // Accepts compact shorthand (p/s/d/bn) AND original full field names.
// // velocity is always 100 — never read from JSON input.

// import { useState } from 'react'
// import { Activity, Download } from '../shared/Icons.jsx'
// import StatusBar from '../shared/StatusBar.jsx'
// import ErrorDisplay from '../shared/ErrorDisplay.jsx'

// const noteMap = {
//   'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
//   'A':9,'A#':10,'BB':10,'B':11,
// }

// // ── Expand compact note to full ───────────────────────────────────────────────
// function normNote(n) {
//   return {
//     pitch:                 n.pitch                ?? n.p,
//     start_subdivision:     n.start_subdivision    ?? n.s ?? 0,
//     offset_percent:        n.offset_percent       ?? n.o ?? 0,
//     duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
//     end_cutoff_percent:    n.end_cutoff_percent   ?? n.c ?? null,
//     velocity:              100,
//   }
// }

// class Engine {
//   static getSubsPerBar(ts) {
//     const [n, d] = ts.split('/').map(Number)
//     const s = n * (16 / d)
//     if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts}`)
//     return s
//   }
//   static pitchToMidi(pitch) {
//     const m = pitch.match(/^([A-G][#Bb]?)(-?\d+)$/i)
//     if (!m) throw new Error(`Invalid pitch: ${pitch}`)
//     const nn = m[1].toUpperCase()
//     if (!(nn in noteMap)) throw new Error(`Unknown note: ${nn}`)
//     return (parseInt(m[2]) + 1) * 12 + noteMap[nn]
//   }
//   static writeVL(v) {
//     let buf = v & 0x7F; const bytes = []
//     while ((v >>= 7) > 0) { buf <<= 8; buf |= (v & 0x7F) | 0x80 }
//     while (true) { bytes.push(buf & 0xFF); if (buf & 0x80) buf >>= 8; else break }
//     return bytes
//   }
//   static jsonToMidiEvents(json) {
//     const { tempo, time_signature, bars } = json
//     const [tn, td] = time_signature.split('/').map(Number)
//     const tpq = 480
//     const subs = this.getSubsPerBar(time_signature)
//     const barTicks = tpq * tn * (4 / td)
//     const tpSub = barTicks / subs
//     const midiEvents = []
//     for (const bar of bars) {
//       if (!bar.notes) continue
//       const barBase = ((bar.bar_number ?? bar.bn) - 1) * barTicks
//       for (const rawNote of bar.notes) {
//         const note = normNote(rawNote)
//         const mp  = this.pitchToMidi(note.pitch)
//         const vel = 100
//         const startTick = barBase + note.start_subdivision * tpSub + (note.offset_percent / 100) * tpSub
//         let durTicks
//         if (note.duration_subdivisions === 0) {
//           durTicks = ((note.end_cutoff_percent || 50) / 100) * tpSub
//         } else {
//           durTicks = note.duration_subdivisions * tpSub
//           if (note.end_cutoff_percent !== null && note.end_cutoff_percent !== undefined) {
//             durTicks = (note.duration_subdivisions - 1) * tpSub + (note.end_cutoff_percent / 100) * tpSub
//           }
//         }
//         if (durTicks <= 0) continue
//         midiEvents.push({ tick: startTick, type: 'on', pitch: mp, velocity: vel })
//         midiEvents.push({ tick: startTick + durTicks, type: 'off', pitch: mp, velocity: 0 })
//       }
//     }
//     midiEvents.sort((a, b) => a.tick !== b.tick ? a.tick - b.tick : a.type === 'off' ? -1 : 1)
//     return { midiEvents, tempo, timeSig: { numerator: tn, denominator: td }, tpq }
//   }
//   static generateMidi(midiEvents, tempo, timeSig, tpq) {
//     const data = []
//     const wb = (bytes) => bytes.forEach(b => data.push(b & 0xFF))
//     const wi = (v, n) => { for (let i = n - 1; i >= 0; i--) data.push((v >> (8 * i)) & 0xFF) }
//     wb([0x4D,0x54,0x68,0x64]); wi(6,4); wi(0,2); wi(1,2); wi(tpq,2)
//     const td = []
//     td.push(...this.writeVL(0)); td.push(0xFF,0x51,0x03)
//     const us = Math.round(60000000 / tempo)
//     td.push((us>>16)&0xFF,(us>>8)&0xFF,us&0xFF)
//     td.push(...this.writeVL(0)); td.push(0xFF,0x58,0x04)
//     td.push(timeSig.numerator, Math.log2(timeSig.denominator), 24, 8)
//     td.push(...this.writeVL(0)); td.push(0xC0,0x00)
//     let last = 0
//     for (const ev of midiEvents) {
//       const dt = Math.max(0, Math.round(ev.tick - last))
//       td.push(...this.writeVL(dt))
//       if (ev.type === 'on') td.push(0x90, ev.pitch & 0x7F, ev.velocity & 0x7F)
//       else td.push(0x80, ev.pitch & 0x7F, 0x40)
//       last += dt
//     }
//     td.push(...this.writeVL(0)); td.push(0xFF,0x2F,0x00)
//     wb([0x4D,0x54,0x72,0x6B]); wi(td.length,4); wb(td)
//     return new Uint8Array(data)
//   }
//   static convert(jsonStr) {
//     const json = typeof jsonStr === 'string' ? JSON.parse(jsonStr) : jsonStr
//     if (!json.bars || json.bars.length === 0) throw new Error('No bars found')
//     if (!json.time_signature) throw new Error('Missing time_signature')
//     if (!json.tempo) throw new Error('Missing tempo')
//     const { midiEvents, tempo, timeSig, tpq } = this.jsonToMidiEvents(json)
//     return this.generateMidi(midiEvents, tempo, timeSig, tpq)
//   }
// }

// // ── Sample uses compact format ────────────────────────────────────────────────
// const SAMPLE = JSON.stringify({
//   tempo: 85, time_signature: '4/4', key: 'Dm',
//   subdivisions_per_bar: 16,
//   bars: [
//     { bn: 1, notes: [
//       { p: 'D2', s: 0, d: 16 },
//       { p: 'F4', s: 4, d: 4 },
//       { p: 'A4', s: 8, d: 8 },
//     ]},
//     { bn: 2, notes: [
//       { p: 'D2', s: 0, d: 16 },
//       { p: 'A4', s: 0, d: 8 },
//     ]},
//   ],
// }, null, 2)

// export default function JsonToMidi() {
//   const [input,  setInput]  = useState(SAMPLE)
//   const [errors, setErrors] = useState([])
//   const [status, setStatus] = useState(null)
//   const [stats,  setStats]  = useState(null)

//   const valid = (() => { try { JSON.parse(input); return true } catch { return false } })()

//   const convert = () => {
//     setErrors([]); setStatus(null); setStats(null)
//     try {
//       const json  = JSON.parse(input)
//       const bytes = Engine.convert(json)
//       const blob  = new Blob([bytes], { type: 'audio/midi' })
//       const url   = URL.createObjectURL(blob)
//       const a     = document.createElement('a')
//       a.href      = url
//       a.download  = `${json.key || 'composition'}_${json.tempo}bpm.mid`
//       document.body.appendChild(a); a.click()
//       URL.revokeObjectURL(url); document.body.removeChild(a)
//       const totalNotes = json.bars.reduce((s, b) => s + (b.notes?.length || 0), 0)
//       setStats({ bars: json.bars.length, notes: totalNotes, tempo: json.tempo })
//       setStatus('ok')
//     } catch (e) {
//       setErrors([e.message])
//       setStatus('error')
//     }
//   }

//   return (
//     <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
//       {/* Field reference */}
//       <div style={{
//         background: 'var(--surface2)', border: '1px solid var(--border)',
//         borderRadius: 'var(--radius-sm)', padding: '10px 14px',
//         fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)',
//         lineHeight: 1.8,
//       }}>
//         <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Compact fields: </span>
//         <span style={{ color: 'var(--accent)' }}>p</span>=pitch&nbsp;&nbsp;
//         <span style={{ color: 'var(--accent)' }}>s</span>=start_subdivision&nbsp;&nbsp;
//         <span style={{ color: 'var(--accent)' }}>d</span>=duration_subdivisions&nbsp;&nbsp;
//         <span style={{ color: 'var(--text3)' }}>o</span>=offset (omit if 0)&nbsp;&nbsp;
//         <span style={{ color: 'var(--text3)' }}>c</span>=cutoff (omit if null)&nbsp;&nbsp;
//         <span style={{ color: 'var(--text3)' }}>bn</span>=bar_number&nbsp;&nbsp;
//         <span style={{ color: 'rgba(245,85,74,0.8)' }}>velocity removed</span> (always 100)
//       </div>

//       {/* Input */}
//       <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
//         <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
//           <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)' }}>
//             JSON Input
//           </div>
//           <span style={{
//             fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 7px',
//             borderRadius: 4,
//             background: valid ? 'rgba(184,245,74,0.07)' : 'rgba(245,85,74,0.07)',
//             color: valid ? 'var(--lime)' : 'var(--rose)',
//             border: `1px solid ${valid ? 'rgba(184,245,74,0.2)' : 'rgba(245,85,74,0.2)'}`,
//           }}>
//             {valid ? '✓ valid JSON' : '✗ invalid JSON'}
//           </span>
//         </div>
//         <textarea
//           value={input}
//           onChange={e => setInput(e.target.value)}
//           spellCheck={false}
//           style={{
//             minHeight: 260, width: '100%',
//             background: 'var(--surface2)', border: '1px solid var(--border)',
//             borderRadius: 'var(--radius-sm)', padding: 12,
//             color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12,
//             resize: 'vertical', outline: 'none', lineHeight: 1.7,
//           }}
//         />
//         <button
//           onClick={convert}
//           disabled={!valid}
//           style={{
//             display: 'flex', alignItems: 'center', gap: 6,
//             padding: '10px 18px', borderRadius: 'var(--radius-sm)',
//             background: valid ? 'var(--accent)' : 'var(--surface3)',
//             color: valid ? '#000' : 'var(--text3)',
//             fontSize: 13, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed',
//             border: 'none', transition: 'all 0.15s ease', alignSelf: 'flex-start',
//             fontFamily: 'var(--font)',
//           }}
//         >
//           <Download size={14} /> Convert & Download .mid
//         </button>
//         <ErrorDisplay errors={errors} />
//         {status === 'ok' && stats && (
//           <StatusBar status="ok" message={`Downloaded · ${stats.bars} bars · ${stats.notes} notes · ${stats.tempo} BPM · velocity=100`} />
//         )}
//       </div>
//     </div>
//   )
// }











// frontend/src/components/tools/JsonToMidi.jsx
// Accepts compact shorthand (p/s/d/bn) AND original full field names.
// velocity is always 100 — never read from JSON input.

import { useState } from 'react'
import { Activity, Download } from '../shared/Icons.jsx'
import StatusBar from '../shared/StatusBar.jsx'
import ErrorDisplay from '../shared/ErrorDisplay.jsx'

const noteMap = {
  'C':0,'C#':1,'DB':1,'D':2,'D#':3,'EB':3,'E':4,'F':5,'F#':6,'GB':6,'G':7,'G#':8,'AB':8,
  'A':9,'A#':10,'BB':10,'B':11,
}

// ── Expand compact note to full ───────────────────────────────────────────────
function normaliseNote(n) {
  return {
    pitch:                 n.pitch                ?? n.p,
    start_subdivision:     n.start_subdivision    ?? n.s ?? 0,
    offset_percent:        n.offset_percent       ?? n.o ?? 0,
    duration_subdivisions: n.duration_subdivisions ?? n.d ?? 4,
    end_cutoff_percent:    n.end_cutoff_percent   ?? n.c ?? null,
    velocity:              100,   // always fixed — never read from input
  }
}

function normaliseBar(b) {
  return {
    bar_number: b.bar_number ?? b.bn,
    notes: (b.notes ?? []).map(normaliseNote),
  }
}

class Engine {
  static getSubsPerBar(ts) {
    const [n, d] = ts.split('/').map(Number)
    const s = n * (16 / d)
    if (!Number.isInteger(s)) throw new Error(`Invalid time signature: ${ts}`)
    return s
  }

  static pitchToMidi(pitch) {
    const m = pitch.match(/^([A-G][#Bb]?)(-?\d+)$/i)
    if (!m) throw new Error(`Invalid pitch: ${pitch}`)
    const nn = m[1].toUpperCase()
    if (!(nn in noteMap)) throw new Error(`Unknown note: ${nn}`)
    return (parseInt(m[2]) + 1) * 12 + noteMap[nn]
  }

  static writeVL(v) {
    let buf = v & 0x7F; const bytes = []
    while ((v >>= 7) > 0) { buf <<= 8; buf |= (v & 0x7F) | 0x80 }
    while (true) { bytes.push(buf & 0xFF); if (buf & 0x80) buf >>= 8; else break }
    return bytes
  }

  static jsonToMidiEvents(json) {
    const { tempo, time_signature, bars } = json
    const [tn, td] = time_signature.split('/').map(Number)
    const tpq = 480
    const subs = this.getSubsPerBar(time_signature)
    const barTicks = tpq * tn * (4 / td)
    const tpSub = barTicks / subs
    const midiEvents = []

    for (const rawBar of bars) {
      const bar = normaliseBar(rawBar)
      if (!bar.notes) continue
      const barBase = (bar.bar_number - 1) * barTicks

      for (const note of bar.notes) {
        const mp  = this.pitchToMidi(note.pitch)
        const vel = 100   // always fixed

        const startTick = barBase
          + note.start_subdivision * tpSub
          + ((note.offset_percent || 0) / 100) * tpSub

        let durTicks
        if (note.duration_subdivisions === 0) {
          durTicks = ((note.end_cutoff_percent || 50) / 100) * tpSub
        } else {
          durTicks = note.duration_subdivisions * tpSub
          if (note.end_cutoff_percent !== null && note.end_cutoff_percent !== undefined) {
            durTicks = (note.duration_subdivisions - 1) * tpSub
              + (note.end_cutoff_percent / 100) * tpSub
          }
        }

        if (durTicks <= 0) continue
        midiEvents.push({ tick: startTick,            type: 'on',  pitch: mp, velocity: vel })
        midiEvents.push({ tick: startTick + durTicks, type: 'off', pitch: mp, velocity: 0   })
      }
    }

    midiEvents.sort((a, b) =>
      a.tick !== b.tick ? a.tick - b.tick : a.type === 'off' ? -1 : 1
    )
    return { midiEvents, tempo, timeSig: { numerator: tn, denominator: td }, tpq }
  }

  static generateMidi(midiEvents, tempo, timeSig, tpq) {
    const data = []
    const wb = (bytes) => bytes.forEach(b => data.push(b & 0xFF))
    const wi = (v, n) => { for (let i = n - 1; i >= 0; i--) data.push((v >> (8 * i)) & 0xFF) }

    wb([0x4D,0x54,0x68,0x64]); wi(6,4); wi(0,2); wi(1,2); wi(tpq,2)

    const td = []
    td.push(...this.writeVL(0)); td.push(0xFF,0x51,0x03)
    const us = Math.round(60000000 / tempo)
    td.push((us>>16)&0xFF,(us>>8)&0xFF,us&0xFF)
    td.push(...this.writeVL(0)); td.push(0xFF,0x58,0x04)
    td.push(timeSig.numerator, Math.log2(timeSig.denominator), 24, 8)
    td.push(...this.writeVL(0)); td.push(0xC0,0x00)

    let last = 0
    for (const ev of midiEvents) {
      const dt = Math.max(0, Math.round(ev.tick - last))
      td.push(...this.writeVL(dt))
      if (ev.type === 'on') td.push(0x90, ev.pitch & 0x7F, ev.velocity & 0x7F)
      else                  td.push(0x80, ev.pitch & 0x7F, 0x40)
      last += dt
    }
    td.push(...this.writeVL(0)); td.push(0xFF,0x2F,0x00)

    wb([0x4D,0x54,0x72,0x6B]); wi(td.length,4); wb(td)
    return new Uint8Array(data)
  }

  static convert(json) {
    if (!json.bars || json.bars.length === 0) throw new Error('No bars found')
    if (!json.time_signature) throw new Error('Missing time_signature')
    if (!json.tempo)          throw new Error('Missing tempo')
    const { midiEvents, tempo, timeSig, tpq } = this.jsonToMidiEvents(json)
    return this.generateMidi(midiEvents, tempo, timeSig, tpq)
  }
}

// ── Sample uses compact shorthand format ──────────────────────────────────────
const SAMPLE = JSON.stringify({
  tempo: 85, time_signature: '4/4', key: 'Dm',
  subdivisions_per_bar: 16,
  bars: [
    { bn: 1, notes: [
      { p: 'D2', s: 0,  d: 16 },
      { p: 'F4', s: 4,  d: 4  },
      { p: 'A4', s: 8,  d: 8  },
    ]},
    { bn: 2, notes: [
      { p: 'D2', s: 0, d: 16 },
      { p: 'A4', s: 0, d: 8  },
    ]},
  ],
}, null, 2)

export default function JsonToMidi() {
  const [input,  setInput]  = useState(SAMPLE)
  const [errors, setErrors] = useState([])
  const [status, setStatus] = useState(null)
  const [stats,  setStats]  = useState(null)

  const valid = (() => { try { JSON.parse(input); return true } catch { return false } })()

  const convert = () => {
    setErrors([]); setStatus(null); setStats(null)
    try {
      const json  = JSON.parse(input)
      const bytes = Engine.convert(json)
      const blob  = new Blob([bytes], { type: 'audio/midi' })
      const url   = URL.createObjectURL(blob)
      const a     = document.createElement('a')
      a.href      = url
      a.download  = `${json.key || 'composition'}_${json.tempo}bpm.mid`
      document.body.appendChild(a); a.click()
      URL.revokeObjectURL(url); document.body.removeChild(a)
      const totalNotes = json.bars.reduce((s, b) => s + (b.notes?.length || 0), 0)
      setStats({ bars: json.bars.length, notes: totalNotes, tempo: json.tempo })
      setStatus('ok')
    } catch (e) {
      setErrors([e.message])
      setStatus('error')
    }
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
      {/* Field reference */}
      <div style={{
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)', padding: '10px 14px',
        fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)',
        lineHeight: 1.8,
      }}>
        <span style={{ color: 'var(--text2)', fontWeight: 600 }}>Compact fields: </span>
        <span style={{ color: 'var(--accent)' }}>p</span>=pitch&nbsp;&nbsp;
        <span style={{ color: 'var(--accent)' }}>s</span>=start_subdivision&nbsp;&nbsp;
        <span style={{ color: 'var(--accent)' }}>d</span>=duration_subdivisions&nbsp;&nbsp;
        <span style={{ color: 'var(--text3)' }}>o</span>=offset (omit if 0)&nbsp;&nbsp;
        <span style={{ color: 'var(--text3)' }}>c</span>=cutoff (omit if null)&nbsp;&nbsp;
        <span style={{ color: 'var(--text3)' }}>bn</span>=bar_number&nbsp;&nbsp;
        <span style={{ color: 'rgba(245,85,74,0.8)' }}>velocity removed</span> (always 100)
      </div>

      {/* Input */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{
            fontSize: 11, fontWeight: 600, color: 'var(--text2)',
            letterSpacing: '0.5px', textTransform: 'uppercase', fontFamily: 'var(--mono)',
          }}>
            JSON Input
          </div>
          <span style={{
            fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 7px', borderRadius: 4,
            background: valid ? 'rgba(184,245,74,0.07)' : 'rgba(245,85,74,0.07)',
            color: valid ? 'var(--lime)' : 'var(--rose)',
            border: `1px solid ${valid ? 'rgba(184,245,74,0.2)' : 'rgba(245,85,74,0.2)'}`,
          }}>
            {valid ? '✓ valid JSON' : '✗ invalid JSON'}
          </span>
        </div>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          spellCheck={false}
          style={{
            minHeight: 260, width: '100%',
            background: 'var(--surface2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)', padding: 12,
            color: 'var(--text)', fontFamily: 'var(--mono)', fontSize: 12,
            resize: 'vertical', outline: 'none', lineHeight: 1.7,
          }}
        />
        <button
          onClick={convert}
          disabled={!valid}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '10px 18px', borderRadius: 'var(--radius-sm)',
            background: valid ? 'var(--accent)' : 'var(--surface3)',
            color: valid ? '#000' : 'var(--text3)',
            fontSize: 13, fontWeight: 700, cursor: valid ? 'pointer' : 'not-allowed',
            border: 'none', transition: 'all 0.15s ease', alignSelf: 'flex-start',
            fontFamily: 'var(--font)',
          }}
        >
          <Download size={14} /> Convert & Download .mid
        </button>
        <ErrorDisplay errors={errors} />
        {status === 'ok' && stats && (
          <StatusBar status="ok" message={`Downloaded · ${stats.bars} bars · ${stats.notes} notes · ${stats.tempo} BPM · velocity=100`} />
        )}
      </div>
    </div>
  )
}