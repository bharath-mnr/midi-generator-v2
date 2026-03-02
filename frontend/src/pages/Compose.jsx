//E:\pro\midigenerator_v2\frontend\src\pages\Compose.jsx
import { useState, useRef, useEffect } from 'react'
import { useCompose } from '../hooks/useCompose.js'

const ic = (d, size = 16, sw = 1.5) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const COMPOSE_CHIPS = [
  'Cinematic piano, B minor, 76 BPM, 16 bars',
  'Dark orchestral loop, Dm, 85 BPM, 8 bars',
  'Emotional solo piano, Am, slow, 12 bars',
  'Thriller underscore, minimal, 10 bars',
]
const ALTER_CHIPS = [
  'Add warm chord harmony following the melody',
  'Add a walking bass line',
  'Add lush string pads sustaining behind the melody',
  'Add a countermelody weaving between the notes',
]

function Spinner({ size = 14, color = 'currentColor' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      border: `1.5px solid transparent`,
      borderTopColor: color,
      animation: 'spin 0.65s linear infinite',
    }} />
  )
}

function MidiCard({ midi }) {
  const dl = () => {
    const a = document.createElement('a')
    a.href = midi.url; a.download = midi.name
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
  return (
    <div style={{
      marginTop: 8,
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '11px 14px',
      background: 'var(--bg)', border: '1px solid var(--b1)',
      borderRadius: 10,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--b2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--b1)'}
    >
      {/* waveform icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: midi.altered ? 'rgba(96,213,245,0.07)' : 'rgba(200,245,96,0.07)',
        border: `1px solid ${midi.altered ? 'rgba(96,213,245,0.2)' : 'rgba(200,245,96,0.2)'}`,
        color: midi.altered ? 'var(--a2)' : 'var(--a1)',
      }}>
        {ic('M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 15)}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {midi.name}
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
          {[midi.key, `${midi.tempo} BPM`, `${midi.bars} bars`].map(t => (
            <span key={t} className="tag tag-b">{t}</span>
          ))}
          {midi.altered && <span className="tag tag-alt">altered</span>}
        </div>
      </div>

      <button onClick={dl} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '7px 13px', borderRadius: 8,
        background: 'var(--a1)', color: '#000',
        fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
        border: 'none', cursor: 'pointer', flexShrink: 0,
        transition: 'background 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--a1d)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--a1)'}
      >
        {ic('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', 12)}
        Download
      </button>
    </div>
  )
}

function UserMsg({ msg }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 0' }}>
      <div style={{ maxWidth: 'min(500px, 78%)' }}>
        {msg.attached && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 5 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              padding: '3px 9px', borderRadius: 5,
              background: 'rgba(96,213,245,0.07)', border: '1px solid rgba(96,213,245,0.18)',
              fontSize: 10, color: 'var(--a2)', fontFamily: 'var(--mono)',
            }}>
              {ic('M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48', 11)}
              {msg.attached}
            </div>
          </div>
        )}
        <div style={{
          padding: '10px 14px', borderRadius: 12, borderBottomRightRadius: 3,
          background: 'var(--s2)', border: '1px solid var(--b1)',
          fontSize: 13, lineHeight: 1.6, color: 'var(--t1)',
        }}>
          {msg.text}
        </div>
      </div>
    </div>
  )
}

function AiMsg({ msg }) {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 3,
        background: 'rgba(200,245,96,0.08)', border: '1px solid rgba(200,245,96,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--a1)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
      }}>
        ai
      </div>
      <div style={{ flex: 1, minWidth: 0, maxWidth: 'min(560px, calc(100% - 38px))', paddingTop: 4 }}>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: msg.error ? 'var(--a3)' : 'var(--t2)' }}>
          {msg.text}
        </div>
        {msg.midi && <MidiCard midi={msg.midi} />}
      </div>
    </div>
  )
}

function Thinking() {
  return (
    <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 3,
        background: 'rgba(200,245,96,0.08)', border: '1px solid rgba(200,245,96,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--a1)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
      }}>
        ai
      </div>
      <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 0.15, 0.3].map((d, i) => (
            <div key={i} style={{
              width: 4, height: 4, borderRadius: '50%',
              background: 'var(--a1)',
              animation: `pulse 1.2s ${d}s ease-in-out infinite`,
            }} />
          ))}
        </div>
        <div style={{ height: 1.5, width: 100, background: 'var(--b1)', borderRadius: 1, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, transparent, var(--a1), transparent)', animation: 'genBar 1.6s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

function EmptyState({ onChip, isAlter }) {
  const chips = isAlter ? ALTER_CHIPS : COMPOSE_CHIPS
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '60px 24px', gap: 28,
      animation: 'fadeIn 0.4s ease',
    }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--serif)', fontStyle: 'italic',
          fontSize: 'clamp(32px, 5vw, 48px)',
          color: 'var(--t1)', lineHeight: 1.1, marginBottom: 12,
        }}>
          {isAlter ? 'What shall we add?' : 'What shall we compose?'}
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mono)', letterSpacing: 0.5 }}>
          {isAlter
            ? 'describe the layers to add to your uploaded MIDI'
            : 'describe a mood, key, tempo, style — or pick a suggestion'
          }
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', maxWidth: 540 }}>
        {chips.map((c, i) => (
          <button key={i} onClick={() => onChip(c)} style={{
            padding: '7px 14px', borderRadius: 100,
            border: '1px solid var(--b1)',
            background: 'var(--s1)', color: 'var(--t3)',
            fontSize: 12, cursor: 'pointer',
            fontFamily: 'var(--font)', transition: 'all 0.12s',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = isAlter ? 'rgba(96,213,245,0.4)' : 'rgba(200,245,96,0.4)'
              e.currentTarget.style.color = isAlter ? 'var(--a2)' : 'var(--a1)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--b1)'
              e.currentTarget.style.color = 'var(--t3)'
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

export default function Compose() {
  const { messages, generating, sendMessage, clear } = useCompose()
  const [input,   setInput]   = useState('')
  const [file,    setFile]    = useState(null)
  const scrollRef = useRef(null)
  const textRef   = useRef(null)
  const fileRef   = useRef(null)

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, generating])

  const send = () => {
    if (!input.trim() || generating) return
    sendMessage(input.trim(), file)
    setInput(''); setFile(null)
    if (textRef.current) textRef.current.style.height = 'auto'
  }

  const onKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
    if (textRef.current) {
      textRef.current.style.height = 'auto'
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 120) + 'px'
    }
  }

  const isAlter = !!file
  const canSend = !!input.trim() && !generating

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>

      {/* ── Messages ── */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
      }}>
        {messages.length === 0 && !generating
          ? <EmptyState onChip={t => { setInput(t); textRef.current?.focus() }} isAlter={isAlter} />
          : (
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {messages.map(m => m.role === 'user'
                ? <UserMsg key={m.id} msg={m} />
                : <AiMsg   key={m.id} msg={m} />
              )}
              {generating && <Thinking />}
            </div>
          )
        }
      </div>

      {/* ── File pill ── */}
      {file && (
        <div style={{ padding: '0 16px 6px', animation: 'fadeUp 0.15s ease' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 10px 5px 12px',
            background: 'rgba(96,213,245,0.06)',
            border: '1px solid rgba(96,213,245,0.22)',
            borderRadius: 8, fontSize: 11,
            color: 'var(--a2)', fontFamily: 'var(--mono)',
          }}>
            {ic('M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 12)}
            <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </span>
            <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(96,213,245,0.12)', fontSize: 9, letterSpacing: 1 }}>
              ALTER
            </span>
            <button onClick={() => setFile(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--t3)', display: 'flex', padding: 1, marginLeft: 2,
              transition: 'color 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--a3)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
            >
              {ic('M18 6L6 18M6 6l12 12', 13)}
            </button>
          </div>
        </div>
      )}

      {/* ── Input ── */}
      <div style={{ padding: '8px 16px 16px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 0,
          background: 'var(--s1)',
          border: `1px solid ${isAlter ? 'rgba(96,213,245,0.3)' : 'var(--b1)'}`,
          borderRadius: 14, padding: '6px 6px 6px 6px',
          transition: 'border-color 0.2s',
          boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
        }}
          onFocusCapture={e => e.currentTarget.style.borderColor = isAlter ? 'rgba(96,213,245,0.5)' : 'var(--b2)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = isAlter ? 'rgba(96,213,245,0.3)' : 'var(--b1)'}
        >
          {/* Attach */}
          <input ref={fileRef} type="file" accept=".mid,.midi" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) setFile(f); e.target.value = '' }} />
          <button onClick={() => fileRef.current?.click()} title="Attach MIDI to alter" style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: file ? 'rgba(96,213,245,0.1)' : 'none',
            border: `1px solid ${file ? 'rgba(96,213,245,0.25)' : 'transparent'}`,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: file ? 'var(--a2)' : 'var(--t3)',
            transition: 'all 0.12s', alignSelf: 'flex-end', marginBottom: 1,
          }}
            onMouseEnter={e => { if (!file) { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'var(--s2)' } }}
            onMouseLeave={e => { if (!file) { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none' } }}
          >
            {ic('M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48', 15)}
          </button>

          {/* Textarea */}
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={generating}
            placeholder={isAlter
              ? 'Describe what layers to add…'
              : 'Describe your composition — key, mood, tempo, style…'
            }
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--t1)', fontSize: 13, lineHeight: 1.55,
              resize: 'none', fontFamily: 'var(--font)',
              padding: '8px 10px', minHeight: 34, maxHeight: 120,
            }}
          />

          {/* Send */}
          <button onClick={send} disabled={!canSend} style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: canSend
              ? isAlter ? 'var(--a2)' : 'var(--a1)'
              : 'var(--s2)',
            border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: canSend ? '#000' : 'var(--t3)',
            transition: 'all 0.12s', alignSelf: 'flex-end', marginBottom: 1,
          }}
            onMouseEnter={e => { if (canSend) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {generating
              ? <Spinner size={13} color={canSend ? '#000' : 'var(--t3)'} />
              : ic('M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z', 14)
            }
          </button>
        </div>

        {/* Bottom hint */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '0 2px' }}>
          <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>
            {isAlter ? '📎 alter mode active' : '↵ send  ·  ⇧↵ newline  ·  📎 attach MIDI to alter'}
          </div>
          {messages.length > 0 && !generating && (
            <button onClick={clear} style={{
              fontSize: 10, color: 'var(--t4)', background: 'none',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)',
              transition: 'color 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--t4)'}
            >
              clear
            </button>
          )}
        </div>
      </div>
    </div>
  )
}