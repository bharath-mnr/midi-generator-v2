//E:\pro\midigenerator_v2\frontend\src\pages\Compose.jsx


import { useState, useRef, useEffect } from 'react'
import { useCompose } from '../hooks/useCompose.js'
import { Send, Waveform, Download, Music } from '../components/shared/Icons.jsx'

const SUGGESTIONS = [
  'Epic cinematic piano in B minor, 76 BPM, 16 bars',
  'Dark orchestral loop in Dm, 85 BPM, 8 bars',
  'Emotional solo piano, slow and legato, Am, 12 bars',
  'Tense thriller underscore, minimal texture, 10 bars',
]

function TypingDots() {
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
      {[0, 0.18, 0.36].map((d, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--accent)',
          animation: `pulse 1.1s ease-in-out ${d}s infinite`,
        }} />
      ))}
    </div>
  )
}

function MidiCard({ midi }) {
  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = midi.url
    a.download = midi.name
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div style={{
      marginTop: 10,
      background: 'var(--surface)',
      border: '1px solid var(--border2)',
      borderRadius: 'var(--r-lg)',
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 14,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 10, flexShrink: 0,
        background: 'rgba(232,255,71,0.07)',
        border: '1px solid rgba(232,255,71,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        <Music size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {midi.name}
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2, display: 'flex', gap: 10 }}>
          <span>{midi.meta.key}</span>
          <span>{midi.meta.tempo} BPM</span>
          <span>{midi.meta.bars} bars</span>
        </div>
      </div>
      <button onClick={handleDownload} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '8px 14px', borderRadius: 'var(--r-sm)',
        background: 'var(--accent)', color: '#000',
        fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
        transition: 'all 0.15s ease', flexShrink: 0,
      }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-d)'}
        onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
      >
        <Download size={12} /> Download
      </button>
    </div>
  )
}

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10, animation: 'fadeUp 0.25s ease forwards',
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
        background: isUser ? 'var(--surface3)' : 'rgba(232,255,71,0.08)',
        color: isUser ? 'var(--text2)' : 'var(--accent)',
        border: `1px solid ${isUser ? 'var(--border2)' : 'rgba(232,255,71,0.2)'}`,
        marginTop: 2,
      }}>
        {isUser ? 'U' : 'AI'}
      </div>
      <div style={{ maxWidth: 'min(580px, calc(100vw - 80px))' }}>
        <div style={{
          padding: '10px 14px',
          borderRadius: 12,
          borderTopRightRadius: isUser ? 3 : 12,
          borderTopLeftRadius: isUser ? 12 : 3,
          fontSize: 13, lineHeight: 1.7, color: 'var(--text)',
          background: isUser ? 'rgba(232,255,71,0.06)' : 'var(--surface2)',
          border: `1px solid ${isUser ? 'rgba(232,255,71,0.12)' : 'var(--border)'}`,
        }}>
          {msg.text}
        </div>
        {msg.midi && <MidiCard midi={msg.midi} />}
      </div>
    </div>
  )
}

export default function Compose() {
  const [input, setInput] = useState('')
  const { messages, generating, sendMessage } = useCompose()
  const scrollRef = useRef(null)
  const textRef   = useRef(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, generating])

  const handleSend = () => {
    if (!input.trim() || generating) return
    sendMessage(input.trim())
    setInput('')
    if (textRef.current) { textRef.current.style.height = 'auto' }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (textRef.current) {
      textRef.current.style.height = 'auto'
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 130) + 'px'
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Header bar */}
      <div style={{
        padding: '14px 24px', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)', flexShrink: 0,
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{ color: 'var(--accent)' }}><Waveform size={16} /></div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Compose</div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          RAG + Gemini
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px, 3vw, 24px)', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {messages.length === 0 && !generating && (
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            gap: 20, textAlign: 'center', padding: 40,
            animation: 'fadeIn 0.4s ease forwards',
          }}>
            <div style={{
              fontFamily: 'var(--display)', fontSize: 'clamp(28px, 8vw, 48px)', letterSpacing: 2,
              color: 'var(--text)', lineHeight: 1,
            }}>
              WHAT DO YOU<br />
              <span style={{ color: 'var(--accent)' }}>WANT TO MAKE?</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 380, lineHeight: 1.8 }}>
              Describe a mood, genre, key, tempo. The AI generates a downloadable MIDI using your knowledge base.
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => sendMessage(s)} style={{
                  padding: '7px 14px', borderRadius: 20,
                  border: '1px solid var(--border2)',
                  background: 'var(--surface2)', color: 'var(--text2)',
                  fontSize: 12, cursor: 'pointer', transition: 'all 0.15s ease',
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(msg => <Message key={msg.id} msg={msg} />)}

        {generating && (
          <div style={{ display: 'flex', gap: 10, animation: 'fadeUp 0.25s ease forwards' }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: 'rgba(232,255,71,0.08)', color: 'var(--accent)',
              border: '1px solid rgba(232,255,71,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', marginTop: 2,
            }}>AI</div>
            <div style={{
              padding: '12px 16px', borderRadius: 12, borderTopLeftRadius: 3,
              background: 'var(--surface2)', border: '1px solid var(--border)',
            }}>
              <TypingDots />
              <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden', marginTop: 8, width: 140 }}>
                <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 1, animation: 'genBar 1.8s ease-in-out infinite' }} />
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 6 }}>composing…</div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: 'clamp(10px, 2vw, 14px) clamp(12px, 3vw, 20px) clamp(14px, 3vw, 18px)',
        background: 'var(--surface)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={generating}
            placeholder="Describe your composition… dark cinematic, Dm, 85 BPM"
            rows={1}
            style={{
              flex: 1, background: 'var(--surface2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--r)', padding: '11px 14px',
              color: 'var(--text)', fontSize: 13,
              resize: 'none', outline: 'none',
              transition: 'border-color 0.2s ease',
              lineHeight: 1.5, minHeight: 44, maxHeight: 130,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border2)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button onClick={handleSend} disabled={generating || !input.trim()} style={{
            width: 42, height: 42, borderRadius: 'var(--r-sm)',
            background: !input.trim() || generating ? 'var(--surface3)' : 'var(--accent)',
            border: 'none', cursor: !input.trim() || generating ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: !input.trim() || generating ? 'var(--text3)' : '#000',
            transition: 'all 0.15s ease', flexShrink: 0,
          }}
            onMouseEnter={e => { if (input.trim() && !generating) e.currentTarget.style.background = 'var(--accent-d)' }}
            onMouseLeave={e => { e.currentTarget.style.background = !input.trim() || generating ? 'var(--surface3)' : 'var(--accent)' }}
          >
            <Send size={15} />
          </button>
        </div>
        <div style={{ marginTop: 7, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          Enter to send · Shift+Enter for newline
        </div>
      </div>
    </div>
  )
}