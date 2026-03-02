// //E:\pro\midigenerator_v2\frontend\src\pages\Compose.jsx


// import { useState, useRef, useEffect } from 'react'
// import { useCompose } from '../hooks/useCompose.js'
// import { Send, Waveform, Download, Music } from '../components/shared/Icons.jsx'

// const SUGGESTIONS = [
//   'Epic cinematic piano in B minor, 76 BPM, 16 bars',
//   'Dark orchestral loop in Dm, 85 BPM, 8 bars',
//   'Emotional solo piano, slow and legato, Am, 12 bars',
//   'Tense thriller underscore, minimal texture, 10 bars',
// ]

// function TypingDots() {
//   return (
//     <div style={{ display: 'flex', gap: 4, alignItems: 'center', padding: '4px 0' }}>
//       {[0, 0.18, 0.36].map((d, i) => (
//         <div key={i} style={{
//           width: 6, height: 6, borderRadius: '50%',
//           background: 'var(--accent)',
//           animation: `pulse 1.1s ease-in-out ${d}s infinite`,
//         }} />
//       ))}
//     </div>
//   )
// }

// function MidiCard({ midi }) {
//   const handleDownload = () => {
//     const a = document.createElement('a')
//     a.href = midi.url
//     a.download = midi.name
//     document.body.appendChild(a)
//     a.click()
//     document.body.removeChild(a)
//   }

//   return (
//     <div style={{
//       marginTop: 10,
//       background: 'var(--surface)',
//       border: '1px solid var(--border2)',
//       borderRadius: 'var(--r-lg)',
//       padding: '14px 16px',
//       display: 'flex', alignItems: 'center', gap: 14,
//     }}>
//       <div style={{
//         width: 40, height: 40, borderRadius: 10, flexShrink: 0,
//         background: 'rgba(232,255,71,0.07)',
//         border: '1px solid rgba(232,255,71,0.15)',
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         color: 'var(--accent)',
//       }}>
//         <Music size={18} />
//       </div>
//       <div style={{ flex: 1, minWidth: 0 }}>
//         <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
//           {midi.name}
//         </div>
//         <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2, display: 'flex', gap: 10 }}>
//           <span>{midi.meta.key}</span>
//           <span>{midi.meta.tempo} BPM</span>
//           <span>{midi.meta.bars} bars</span>
//         </div>
//       </div>
//       <button onClick={handleDownload} style={{
//         display: 'flex', alignItems: 'center', gap: 6,
//         padding: '8px 14px', borderRadius: 'var(--r-sm)',
//         background: 'var(--accent)', color: '#000',
//         fontSize: 12, fontWeight: 700, cursor: 'pointer', border: 'none',
//         transition: 'all 0.15s ease', flexShrink: 0,
//       }}
//         onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-d)'}
//         onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
//       >
//         <Download size={12} /> Download
//       </button>
//     </div>
//   )
// }

// function Message({ msg }) {
//   const isUser = msg.role === 'user'
//   return (
//     <div style={{
//       display: 'flex',
//       flexDirection: isUser ? 'row-reverse' : 'row',
//       gap: 10, animation: 'fadeUp 0.25s ease forwards',
//     }}>
//       <div style={{
//         width: 28, height: 28, borderRadius: 8, flexShrink: 0,
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
//         background: isUser ? 'var(--surface3)' : 'rgba(232,255,71,0.08)',
//         color: isUser ? 'var(--text2)' : 'var(--accent)',
//         border: `1px solid ${isUser ? 'var(--border2)' : 'rgba(232,255,71,0.2)'}`,
//         marginTop: 2,
//       }}>
//         {isUser ? 'U' : 'AI'}
//       </div>
//       <div style={{ maxWidth: 'min(580px, calc(100vw - 80px))' }}>
//         <div style={{
//           padding: '10px 14px',
//           borderRadius: 12,
//           borderTopRightRadius: isUser ? 3 : 12,
//           borderTopLeftRadius: isUser ? 12 : 3,
//           fontSize: 13, lineHeight: 1.7, color: 'var(--text)',
//           background: isUser ? 'rgba(232,255,71,0.06)' : 'var(--surface2)',
//           border: `1px solid ${isUser ? 'rgba(232,255,71,0.12)' : 'var(--border)'}`,
//         }}>
//           {msg.text}
//         </div>
//         {msg.midi && <MidiCard midi={msg.midi} />}
//       </div>
//     </div>
//   )
// }

// export default function Compose() {
//   const [input, setInput] = useState('')
//   const { messages, generating, sendMessage } = useCompose()
//   const scrollRef = useRef(null)
//   const textRef   = useRef(null)

//   useEffect(() => {
//     if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
//   }, [messages, generating])

//   const handleSend = () => {
//     if (!input.trim() || generating) return
//     sendMessage(input.trim())
//     setInput('')
//     if (textRef.current) { textRef.current.style.height = 'auto' }
//   }

//   const handleKey = (e) => {
//     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
//     if (textRef.current) {
//       textRef.current.style.height = 'auto'
//       textRef.current.style.height = Math.min(textRef.current.scrollHeight, 130) + 'px'
//     }
//   }

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

//       {/* Header bar */}
//       <div style={{
//         padding: '14px 24px', borderBottom: '1px solid var(--border)',
//         background: 'var(--surface)', flexShrink: 0,
//         display: 'flex', alignItems: 'center', gap: 10,
//       }}>
//         <div style={{ color: 'var(--accent)' }}><Waveform size={16} /></div>
//         <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Compose</div>
//         <div style={{ flex: 1 }} />
//         <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
//           RAG + Gemini
//         </div>
//       </div>

//       {/* Messages */}
//       <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: 'clamp(12px, 3vw, 24px)', display: 'flex', flexDirection: 'column', gap: 18 }}>

//         {messages.length === 0 && !generating && (
//           <div style={{
//             flex: 1, display: 'flex', flexDirection: 'column',
//             alignItems: 'center', justifyContent: 'center',
//             gap: 20, textAlign: 'center', padding: 40,
//             animation: 'fadeIn 0.4s ease forwards',
//           }}>
//             <div style={{
//               fontFamily: 'var(--display)', fontSize: 'clamp(28px, 8vw, 48px)', letterSpacing: 2,
//               color: 'var(--text)', lineHeight: 1,
//             }}>
//               WHAT DO YOU<br />
//               <span style={{ color: 'var(--accent)' }}>WANT TO MAKE?</span>
//             </div>
//             <div style={{ fontSize: 13, color: 'var(--text3)', maxWidth: 380, lineHeight: 1.8 }}>
//               Describe a mood, genre, key, tempo. The AI generates a downloadable MIDI using your knowledge base.
//             </div>
//             <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 4 }}>
//               {SUGGESTIONS.map((s, i) => (
//                 <button key={i} onClick={() => sendMessage(s)} style={{
//                   padding: '7px 14px', borderRadius: 20,
//                   border: '1px solid var(--border2)',
//                   background: 'var(--surface2)', color: 'var(--text2)',
//                   fontSize: 12, cursor: 'pointer', transition: 'all 0.15s ease',
//                 }}
//                   onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
//                   onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text2)' }}
//                 >
//                   {s}
//                 </button>
//               ))}
//             </div>
//           </div>
//         )}

//         {messages.map(msg => <Message key={msg.id} msg={msg} />)}

//         {generating && (
//           <div style={{ display: 'flex', gap: 10, animation: 'fadeUp 0.25s ease forwards' }}>
//             <div style={{
//               width: 28, height: 28, borderRadius: 8, flexShrink: 0,
//               background: 'rgba(232,255,71,0.08)', color: 'var(--accent)',
//               border: '1px solid rgba(232,255,71,0.2)',
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//               fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)', marginTop: 2,
//             }}>AI</div>
//             <div style={{
//               padding: '12px 16px', borderRadius: 12, borderTopLeftRadius: 3,
//               background: 'var(--surface2)', border: '1px solid var(--border)',
//             }}>
//               <TypingDots />
//               <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden', marginTop: 8, width: 140 }}>
//                 <div style={{ height: '100%', background: 'var(--accent)', borderRadius: 1, animation: 'genBar 1.8s ease-in-out infinite' }} />
//               </div>
//               <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 6 }}>composing…</div>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Input */}
//       <div style={{
//         borderTop: '1px solid var(--border)',
//         padding: 'clamp(10px, 2vw, 14px) clamp(12px, 3vw, 20px) clamp(14px, 3vw, 18px)',
//         background: 'var(--surface)', flexShrink: 0,
//       }}>
//         <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
//           <textarea
//             ref={textRef}
//             value={input}
//             onChange={e => setInput(e.target.value)}
//             onKeyDown={handleKey}
//             disabled={generating}
//             placeholder="Describe your composition… dark cinematic, Dm, 85 BPM"
//             rows={1}
//             style={{
//               flex: 1, background: 'var(--surface2)',
//               border: '1px solid var(--border)',
//               borderRadius: 'var(--r)', padding: '11px 14px',
//               color: 'var(--text)', fontSize: 13,
//               resize: 'none', outline: 'none',
//               transition: 'border-color 0.2s ease',
//               lineHeight: 1.5, minHeight: 44, maxHeight: 130,
//             }}
//             onFocus={e => e.target.style.borderColor = 'var(--border2)'}
//             onBlur={e => e.target.style.borderColor = 'var(--border)'}
//           />
//           <button onClick={handleSend} disabled={generating || !input.trim()} style={{
//             width: 42, height: 42, borderRadius: 'var(--r-sm)',
//             background: !input.trim() || generating ? 'var(--surface3)' : 'var(--accent)',
//             border: 'none', cursor: !input.trim() || generating ? 'not-allowed' : 'pointer',
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             color: !input.trim() || generating ? 'var(--text3)' : '#000',
//             transition: 'all 0.15s ease', flexShrink: 0,
//           }}
//             onMouseEnter={e => { if (input.trim() && !generating) e.currentTarget.style.background = 'var(--accent-d)' }}
//             onMouseLeave={e => { e.currentTarget.style.background = !input.trim() || generating ? 'var(--surface3)' : 'var(--accent)' }}
//           >
//             <Send size={15} />
//           </button>
//         </div>
//         <div style={{ marginTop: 7, fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
//           Enter to send · Shift+Enter for newline
//         </div>
//       </div>
//     </div>
//   )
// }











import { useState, useRef, useEffect } from 'react'
import { useCompose } from '../hooks/useCompose.js'

// ── Icons ────────────────────────────────────────────────────────────────────
const I = ({ d, size = 16, sw = 1.5 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill="none" stroke="currentColor" strokeWidth={sw}
    strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const IcSend      = () => <I d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
const IcDownload  = () => <I d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
const IcPaperclip = () => <I d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
const IcX         = () => <I d="M18 6L6 18M6 6l12 12" />
const IcMusic     = () => <I d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
const IcSparkle   = () => <I d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" />

// ── Suggestion chips ─────────────────────────────────────────────────────────
const CHIPS = [
  'Cinematic piano, B minor, 76 BPM, 16 bars',
  'Dark orchestral loop, Dm, 85 BPM, 8 bars',
  'Emotional solo piano, Am, slow, 12 bars',
  'Thriller underscore, minimal, 10 bars',
  'Jazz waltz, F major, 120 BPM, 8 bars',
]

const ALTER_CHIPS = [
  'Add warm chord harmony that follows the melody',
  'Add a walking bass line in the low register',
  'Add lush string pads that sustain behind the melody',
  'Add a countermelody weaving between the notes',
]

// ── Typing indicator ─────────────────────────────────────────────────────────
function Thinking() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: 'linear-gradient(135deg, rgba(232,255,71,0.15), rgba(232,255,71,0.05))',
        border: '1px solid rgba(232,255,71,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        <IcSparkle />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
          {[0, 0.16, 0.32].map((d, i) => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%',
              background: 'var(--accent)',
              animation: `pulse 1.2s ease-in-out ${d}s infinite`,
            }} />
          ))}
        </div>
        <div style={{ height: 2, width: 120, background: 'var(--surface3)', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, transparent, var(--accent), transparent)', animation: 'genBar 1.6s ease-in-out infinite' }} />
        </div>
      </div>
    </div>
  )
}

// ── Single message ────────────────────────────────────────────────────────────
function Msg({ msg }) {
  const isUser = msg.role === 'user'

  const handleDownload = () => {
    if (!msg.midi) return
    const a = document.createElement('a')
    a.href = msg.midi.url
    a.download = msg.midi.name
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 24px', animation: 'fadeUp 0.2s ease forwards' }}>
        <div style={{ maxWidth: 'min(520px, 80%)' }}>
          {msg.attached && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              marginBottom: 6, justifyContent: 'flex-end',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '4px 10px', borderRadius: 6,
                background: 'var(--surface2)', border: '1px solid var(--border)',
                fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)',
              }}>
                <IcPaperclip />
                {msg.attached}
              </div>
            </div>
          )}
          <div style={{
            padding: '11px 16px', borderRadius: 16, borderBottomRightRadius: 4,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            fontSize: 13, lineHeight: 1.65, color: 'var(--text)',
          }}>
            {msg.text}
          </div>
        </div>
      </div>
    )
  }

  // AI message
  return (
    <div style={{ display: 'flex', gap: 12, padding: '4px 24px', animation: 'fadeUp 0.2s ease forwards' }}>
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        background: 'linear-gradient(135deg, rgba(232,255,71,0.15), rgba(232,255,71,0.04))',
        border: '1px solid rgba(232,255,71,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)',
      }}>
        <IcSparkle />
      </div>
      <div style={{ flex: 1, minWidth: 0, maxWidth: 'min(580px, calc(100% - 44px))' }}>
        <div style={{
          fontSize: 13, lineHeight: 1.65, color: msg.error ? 'var(--danger)' : 'var(--text2)',
          paddingTop: 6, marginBottom: msg.midi ? 10 : 0,
        }}>
          {msg.text}
        </div>

        {msg.midi && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 12,
            padding: '12px 16px',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            transition: 'border-color 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{
              width: 38, height: 38, borderRadius: 10, flexShrink: 0,
              background: msg.midi.altered ? 'rgba(71,255,224,0.07)' : 'rgba(232,255,71,0.07)',
              border: `1px solid ${msg.midi.altered ? 'rgba(71,255,224,0.2)' : 'rgba(232,255,71,0.2)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: msg.midi.altered ? 'var(--accent2)' : 'var(--accent)',
            }}>
              <IcMusic />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {msg.midi.name}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 3, flexWrap: 'wrap' }}>
                {[msg.midi.key, `${msg.midi.tempo} BPM`, `${msg.midi.bars} bars`].map(tag => (
                  <span key={tag} style={{
                    fontSize: 10, fontFamily: 'var(--mono)',
                    color: 'var(--text3)',
                    background: 'var(--surface2)',
                    padding: '1px 7px', borderRadius: 4,
                    border: '1px solid var(--border)',
                  }}>{tag}</span>
                ))}
                {msg.midi.altered && (
                  <span style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--accent2)', background: 'rgba(71,255,224,0.07)', padding: '1px 7px', borderRadius: 4, border: '1px solid rgba(71,255,224,0.2)' }}>
                    altered
                  </span>
                )}
              </div>
            </div>
            <button onClick={handleDownload} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '8px 14px', borderRadius: 9,
              background: 'var(--accent)', color: '#000',
              fontSize: 11, fontWeight: 700, letterSpacing: 0.4,
              cursor: 'pointer', border: 'none',
              transition: 'background 0.15s', flexShrink: 0,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-d)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
            >
              <IcDownload />
              Download
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onChip, hasFile }) {
  const chips = hasFile ? ALTER_CHIPS : CHIPS
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 32,
      animation: 'fadeIn 0.5s ease forwards',
    }}>
      {/* Logo mark */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontFamily: 'var(--display)',
          fontSize: 'clamp(36px, 6vw, 56px)',
          letterSpacing: 3, lineHeight: 0.95,
          color: 'var(--text)',
        }}>
          {hasFile ? (
            <>ALTER<br /><span style={{ color: 'var(--accent2)' }}>MIDI</span></>
          ) : (
            <>MIDI<br /><span style={{ color: 'var(--accent)' }}>STUDIO</span></>
          )}
        </div>
        <div style={{ marginTop: 12, fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: 1 }}>
          {hasFile ? 'describe what to add to your track' : 'describe your composition'}
        </div>
      </div>

      {/* Chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', maxWidth: 520 }}>
        {chips.map((c, i) => (
          <button key={i} onClick={() => onChip(c)} style={{
            padding: '8px 16px', borderRadius: 40,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            color: 'var(--text3)', fontSize: 12,
            cursor: 'pointer', transition: 'all 0.15s ease',
            fontFamily: 'var(--font)',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = hasFile ? 'var(--accent2)' : 'var(--accent)'
              e.currentTarget.style.color = hasFile ? 'var(--accent2)' : 'var(--accent)'
              e.currentTarget.style.background = hasFile ? 'rgba(71,255,224,0.04)' : 'rgba(232,255,71,0.04)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text3)'
              e.currentTarget.style.background = 'var(--surface)'
            }}
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function Compose() {
  const { messages, generating, sendMessage, clear } = useCompose()
  const [input,    setInput]   = useState('')
  const [file,     setFile]    = useState(null)
  const scrollRef  = useRef(null)
  const textRef    = useRef(null)
  const fileRef    = useRef(null)

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [messages, generating])

  const handleSend = () => {
    if (!input.trim() || generating) return
    sendMessage(input.trim(), file)
    setInput('')
    setFile(null)
    if (textRef.current) textRef.current.style.height = 'auto'
  }

  const handleKey = e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
    if (textRef.current) {
      textRef.current.style.height = 'auto'
      textRef.current.style.height = Math.min(textRef.current.scrollHeight, 120) + 'px'
    }
  }

  const handleFileChange = e => {
    const f = e.target.files[0]
    if (f) setFile(f)
    e.target.value = ''
  }

  const isAlterMode = !!file
  const canSend = input.trim() && !generating

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)', overflow: 'hidden' }}>

      {/* ── Messages area ── */}
      <div ref={scrollRef} style={{
        flex: 1, overflowY: 'auto',
        display: 'flex', flexDirection: 'column',
        paddingTop: 16, paddingBottom: 8,
      }}>
        {messages.length === 0 && !generating
          ? <EmptyState onChip={p => { setInput(p); textRef.current?.focus() }} hasFile={isAlterMode} />
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingBottom: 8 }}>
              {messages.map(msg => <Msg key={msg.id} msg={msg} />)}
              {generating && <Thinking />}
            </div>
          )
        }
      </div>

      {/* ── File attachment pill ── */}
      {file && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '8px 20px 0',
          animation: 'fadeUp 0.15s ease forwards',
        }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '6px 10px 6px 12px',
            background: 'rgba(71,255,224,0.06)',
            border: '1px solid rgba(71,255,224,0.2)',
            borderRadius: 8,
            fontSize: 12, color: 'var(--accent2)', fontFamily: 'var(--mono)',
          }}>
            <IcMusic />
            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
            <button onClick={() => setFile(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text3)', display: 'flex', alignItems: 'center', padding: 2,
              transition: 'color 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            ><IcX /></button>
          </div>
          <div style={{ fontSize: 10, color: 'var(--accent2)', fontFamily: 'var(--mono)', opacity: 0.7 }}>
            alter mode
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{
        padding: '10px 16px 16px',
        flexShrink: 0,
      }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 6,
          background: 'var(--surface)',
          border: `1px solid ${isAlterMode ? 'rgba(71,255,224,0.25)' : 'var(--border)'}`,
          borderRadius: 16,
          padding: '8px 8px 8px 14px',
          transition: 'border-color 0.2s ease',
        }}
          onFocusCapture={e => {
            e.currentTarget.style.borderColor = isAlterMode ? 'rgba(71,255,224,0.45)' : 'var(--border2)'
          }}
          onBlurCapture={e => {
            e.currentTarget.style.borderColor = isAlterMode ? 'rgba(71,255,224,0.25)' : 'var(--border)'
          }}
        >
          {/* Attach button */}
          <input ref={fileRef} type="file" accept=".mid,.midi" style={{ display: 'none' }} onChange={handleFileChange} />
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach MIDI to alter"
            style={{
              width: 32, height: 32, borderRadius: 8, flexShrink: 0,
              background: file ? 'rgba(71,255,224,0.1)' : 'none',
              border: `1px solid ${file ? 'rgba(71,255,224,0.3)' : 'transparent'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: file ? 'var(--accent2)' : 'var(--text3)',
              transition: 'all 0.15s ease', alignSelf: 'flex-end', marginBottom: 2,
            }}
            onMouseEnter={e => { if (!file) { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = 'var(--text2)' } }}
            onMouseLeave={e => { if (!file) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--text3)' } }}
          >
            <IcPaperclip />
          </button>

          {/* Textarea */}
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={generating}
            placeholder={isAlterMode
              ? 'Describe what to add — harmony, bass, pads…'
              : 'Describe your composition — key, mood, tempo, style…'
            }
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--text)', fontSize: 13, lineHeight: 1.55,
              resize: 'none', fontFamily: 'var(--font)',
              minHeight: 32, maxHeight: 120,
              padding: '6px 0',
            }}
          />

          {/* Send button */}
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{
              width: 34, height: 34, borderRadius: 10, flexShrink: 0,
              background: canSend
                ? isAlterMode ? 'var(--accent2)' : 'var(--accent)'
                : 'var(--surface2)',
              border: 'none',
              cursor: canSend ? 'pointer' : 'not-allowed',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: canSend ? '#000' : 'var(--text3)',
              transition: 'all 0.15s ease',
              alignSelf: 'flex-end',
            }}
            onMouseEnter={e => { if (canSend) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {generating
              ? <div style={{ width: 14, height: 14, border: '2px solid', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <IcSend />
            }
          </button>
        </div>

        {/* Hint row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 7, padding: '0 4px' }}>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {isAlterMode ? '⬡ alter mode — adds layers to your MIDI' : '↵ enter to send · ⇧↵ newline · 📎 attach to alter'}
          </div>
          {messages.length > 0 && !generating && (
            <button onClick={clear} style={{
              fontSize: 10, color: 'var(--text3)', background: 'none',
              border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)',
              transition: 'color 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--text2)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text3)'}
            >
              clear chat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}