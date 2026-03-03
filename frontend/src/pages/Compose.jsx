// // //E:\pro\midigenerator_v2\frontend\src\pages\Compose.jsx
// // import { useState, useRef, useEffect } from 'react'
// // import { useCompose } from '../hooks/useCompose.js'

// // const ic = (d, size = 16, sw = 1.5) => (
// //   <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
// //     stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
// //     <path d={d} />
// //   </svg>
// // )

// // const COMPOSE_CHIPS = [
// //   'Cinematic piano, B minor, 76 BPM, 16 bars',
// //   'Dark orchestral loop, Dm, 85 BPM, 8 bars',
// //   'Emotional solo piano, Am, slow, 12 bars',
// //   'Thriller underscore, minimal, 10 bars',
// // ]
// // const ALTER_CHIPS = [
// //   'Add warm chord harmony following the melody',
// //   'Add a walking bass line',
// //   'Add lush string pads sustaining behind the melody',
// //   'Add a countermelody weaving between the notes',
// // ]

// // function Spinner({ size = 14, color = 'currentColor' }) {
// //   return (
// //     <div style={{
// //       width: size, height: size, borderRadius: '50%',
// //       border: `1.5px solid transparent`,
// //       borderTopColor: color,
// //       animation: 'spin 0.65s linear infinite',
// //     }} />
// //   )
// // }

// // function MidiCard({ midi }) {
// //   const dl = () => {
// //     const a = document.createElement('a')
// //     a.href = midi.url; a.download = midi.name
// //     document.body.appendChild(a); a.click(); document.body.removeChild(a)
// //   }
// //   return (
// //     <div style={{
// //       marginTop: 8,
// //       display: 'flex', alignItems: 'center', gap: 10,
// //       padding: '11px 14px',
// //       background: 'var(--bg)', border: '1px solid var(--b1)',
// //       borderRadius: 10,
// //     }}
// //       onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--b2)'}
// //       onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--b1)'}
// //     >
// //       {/* waveform icon */}
// //       <div style={{
// //         width: 34, height: 34, borderRadius: 8, flexShrink: 0,
// //         display: 'flex', alignItems: 'center', justifyContent: 'center',
// //         background: midi.altered ? 'rgba(96,213,245,0.07)' : 'rgba(200,245,96,0.07)',
// //         border: `1px solid ${midi.altered ? 'rgba(96,213,245,0.2)' : 'rgba(200,245,96,0.2)'}`,
// //         color: midi.altered ? 'var(--a2)' : 'var(--a1)',
// //       }}>
// //         {ic('M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 15)}
// //       </div>

// //       <div style={{ flex: 1, minWidth: 0 }}>
// //         <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
// //           {midi.name}
// //         </div>
// //         <div style={{ display: 'flex', gap: 6, marginTop: 3, flexWrap: 'wrap' }}>
// //           {[midi.key, `${midi.tempo} BPM`, `${midi.bars} bars`].map(t => (
// //             <span key={t} className="tag tag-b">{t}</span>
// //           ))}
// //           {midi.altered && <span className="tag tag-alt">altered</span>}
// //         </div>
// //       </div>

// //       <button onClick={dl} style={{
// //         display: 'flex', alignItems: 'center', gap: 5,
// //         padding: '7px 13px', borderRadius: 8,
// //         background: 'var(--a1)', color: '#000',
// //         fontSize: 11, fontWeight: 600, letterSpacing: 0.3,
// //         border: 'none', cursor: 'pointer', flexShrink: 0,
// //         transition: 'background 0.15s',
// //       }}
// //         onMouseEnter={e => e.currentTarget.style.background = 'var(--a1d)'}
// //         onMouseLeave={e => e.currentTarget.style.background = 'var(--a1)'}
// //       >
// //         {ic('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', 12)}
// //         Download
// //       </button>
// //     </div>
// //   )
// // }

// // function UserMsg({ msg }) {
// //   return (
// //     <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px 0' }}>
// //       <div style={{ maxWidth: 'min(500px, 78%)' }}>
// //         {msg.attached && (
// //           <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 5 }}>
// //             <div style={{
// //               display: 'inline-flex', alignItems: 'center', gap: 5,
// //               padding: '3px 9px', borderRadius: 5,
// //               background: 'rgba(96,213,245,0.07)', border: '1px solid rgba(96,213,245,0.18)',
// //               fontSize: 10, color: 'var(--a2)', fontFamily: 'var(--mono)',
// //             }}>
// //               {ic('M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48', 11)}
// //               {msg.attached}
// //             </div>
// //           </div>
// //         )}
// //         <div style={{
// //           padding: '10px 14px', borderRadius: 12, borderBottomRightRadius: 3,
// //           background: 'var(--s2)', border: '1px solid var(--b1)',
// //           fontSize: 13, lineHeight: 1.6, color: 'var(--t1)',
// //         }}>
// //           {msg.text}
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }

// // function AiMsg({ msg }) {
// //   return (
// //     <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
// //       <div style={{
// //         width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 3,
// //         background: 'rgba(200,245,96,0.08)', border: '1px solid rgba(200,245,96,0.2)',
// //         display: 'flex', alignItems: 'center', justifyContent: 'center',
// //         color: 'var(--a1)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
// //       }}>
// //         ai
// //       </div>
// //       <div style={{ flex: 1, minWidth: 0, maxWidth: 'min(560px, calc(100% - 38px))', paddingTop: 4 }}>
// //         <div style={{ fontSize: 13, lineHeight: 1.65, color: msg.error ? 'var(--a3)' : 'var(--t2)' }}>
// //           {msg.text}
// //         </div>
// //         {msg.midi && <MidiCard midi={msg.midi} />}
// //       </div>
// //     </div>
// //   )
// // }

// // function Thinking() {
// //   return (
// //     <div style={{ display: 'flex', gap: 10, padding: '2px 0' }}>
// //       <div style={{
// //         width: 28, height: 28, borderRadius: '50%', flexShrink: 0, marginTop: 3,
// //         background: 'rgba(200,245,96,0.08)', border: '1px solid rgba(200,245,96,0.2)',
// //         display: 'flex', alignItems: 'center', justifyContent: 'center',
// //         color: 'var(--a1)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
// //       }}>
// //         ai
// //       </div>
// //       <div style={{ paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 7 }}>
// //         <div style={{ display: 'flex', gap: 4 }}>
// //           {[0, 0.15, 0.3].map((d, i) => (
// //             <div key={i} style={{
// //               width: 4, height: 4, borderRadius: '50%',
// //               background: 'var(--a1)',
// //               animation: `pulse 1.2s ${d}s ease-in-out infinite`,
// //             }} />
// //           ))}
// //         </div>
// //         <div style={{ height: 1.5, width: 100, background: 'var(--b1)', borderRadius: 1, overflow: 'hidden' }}>
// //           <div style={{ height: '100%', background: 'linear-gradient(90deg, transparent, var(--a1), transparent)', animation: 'genBar 1.6s ease-in-out infinite' }} />
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }

// // function EmptyState({ onChip, isAlter }) {
// //   const chips = isAlter ? ALTER_CHIPS : COMPOSE_CHIPS
// //   return (
// //     <div style={{
// //       flex: 1, display: 'flex', flexDirection: 'column',
// //       alignItems: 'center', justifyContent: 'center',
// //       padding: '60px 24px', gap: 28,
// //       animation: 'fadeIn 0.4s ease',
// //     }}>
// //       <div style={{ textAlign: 'center' }}>
// //         <div style={{
// //           fontFamily: 'var(--serif)', fontStyle: 'italic',
// //           fontSize: 'clamp(32px, 5vw, 48px)',
// //           color: 'var(--t1)', lineHeight: 1.1, marginBottom: 12,
// //         }}>
// //           {isAlter ? 'What shall we add?' : 'What shall we compose?'}
// //         </div>
// //         <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'var(--mono)', letterSpacing: 0.5 }}>
// //           {isAlter
// //             ? 'describe the layers to add to your uploaded MIDI'
// //             : 'describe a mood, key, tempo, style — or pick a suggestion'
// //           }
// //         </div>
// //       </div>
// //       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', maxWidth: 540 }}>
// //         {chips.map((c, i) => (
// //           <button key={i} onClick={() => onChip(c)} style={{
// //             padding: '7px 14px', borderRadius: 100,
// //             border: '1px solid var(--b1)',
// //             background: 'var(--s1)', color: 'var(--t3)',
// //             fontSize: 12, cursor: 'pointer',
// //             fontFamily: 'var(--font)', transition: 'all 0.12s',
// //           }}
// //             onMouseEnter={e => {
// //               e.currentTarget.style.borderColor = isAlter ? 'rgba(96,213,245,0.4)' : 'rgba(200,245,96,0.4)'
// //               e.currentTarget.style.color = isAlter ? 'var(--a2)' : 'var(--a1)'
// //             }}
// //             onMouseLeave={e => {
// //               e.currentTarget.style.borderColor = 'var(--b1)'
// //               e.currentTarget.style.color = 'var(--t3)'
// //             }}
// //           >
// //             {c}
// //           </button>
// //         ))}
// //       </div>
// //     </div>
// //   )
// // }

// // export default function Compose() {
// //   const { messages, generating, sendMessage, clear } = useCompose()
// //   const [input,   setInput]   = useState('')
// //   const [file,    setFile]    = useState(null)
// //   const scrollRef = useRef(null)
// //   const textRef   = useRef(null)
// //   const fileRef   = useRef(null)

// //   useEffect(() => {
// //     if (scrollRef.current)
// //       scrollRef.current.scrollTop = scrollRef.current.scrollHeight
// //   }, [messages, generating])

// //   const send = () => {
// //     if (!input.trim() || generating) return
// //     sendMessage(input.trim(), file)
// //     setInput(''); setFile(null)
// //     if (textRef.current) textRef.current.style.height = 'auto'
// //   }

// //   const onKey = e => {
// //     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
// //     if (textRef.current) {
// //       textRef.current.style.height = 'auto'
// //       textRef.current.style.height = Math.min(textRef.current.scrollHeight, 120) + 'px'
// //     }
// //   }

// //   const isAlter = !!file
// //   const canSend = !!input.trim() && !generating

// //   return (
// //     <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>

// //       {/* ── Messages ── */}
// //       <div ref={scrollRef} style={{
// //         flex: 1, overflowY: 'auto',
// //         display: 'flex', flexDirection: 'column',
// //       }}>
// //         {messages.length === 0 && !generating
// //           ? <EmptyState onChip={t => { setInput(t); textRef.current?.focus() }} isAlter={isAlter} />
// //           : (
// //             <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
// //               {messages.map(m => m.role === 'user'
// //                 ? <UserMsg key={m.id} msg={m} />
// //                 : <AiMsg   key={m.id} msg={m} />
// //               )}
// //               {generating && <Thinking />}
// //             </div>
// //           )
// //         }
// //       </div>

// //       {/* ── File pill ── */}
// //       {file && (
// //         <div style={{ padding: '0 16px 6px', animation: 'fadeUp 0.15s ease' }}>
// //           <div style={{
// //             display: 'inline-flex', alignItems: 'center', gap: 7,
// //             padding: '5px 10px 5px 12px',
// //             background: 'rgba(96,213,245,0.06)',
// //             border: '1px solid rgba(96,213,245,0.22)',
// //             borderRadius: 8, fontSize: 11,
// //             color: 'var(--a2)', fontFamily: 'var(--mono)',
// //           }}>
// //             {ic('M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z', 12)}
// //             <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
// //               {file.name}
// //             </span>
// //             <span style={{ padding: '1px 6px', borderRadius: 4, background: 'rgba(96,213,245,0.12)', fontSize: 9, letterSpacing: 1 }}>
// //               ALTER
// //             </span>
// //             <button onClick={() => setFile(null)} style={{
// //               background: 'none', border: 'none', cursor: 'pointer',
// //               color: 'var(--t3)', display: 'flex', padding: 1, marginLeft: 2,
// //               transition: 'color 0.1s',
// //             }}
// //               onMouseEnter={e => e.currentTarget.style.color = 'var(--a3)'}
// //               onMouseLeave={e => e.currentTarget.style.color = 'var(--t3)'}
// //             >
// //               {ic('M18 6L6 18M6 6l12 12', 13)}
// //             </button>
// //           </div>
// //         </div>
// //       )}

// //       {/* ── Input ── */}
// //       <div style={{ padding: '8px 16px 16px', flexShrink: 0 }}>
// //         <div style={{
// //           display: 'flex', alignItems: 'flex-end', gap: 0,
// //           background: 'var(--s1)',
// //           border: `1px solid ${isAlter ? 'rgba(96,213,245,0.3)' : 'var(--b1)'}`,
// //           borderRadius: 14, padding: '6px 6px 6px 6px',
// //           transition: 'border-color 0.2s',
// //           boxShadow: '0 2px 16px rgba(0,0,0,0.25)',
// //         }}
// //           onFocusCapture={e => e.currentTarget.style.borderColor = isAlter ? 'rgba(96,213,245,0.5)' : 'var(--b2)'}
// //           onBlurCapture={e => e.currentTarget.style.borderColor = isAlter ? 'rgba(96,213,245,0.3)' : 'var(--b1)'}
// //         >
// //           {/* Attach */}
// //           <input ref={fileRef} type="file" accept=".mid,.midi" style={{ display: 'none' }}
// //             onChange={e => { const f = e.target.files[0]; if (f) setFile(f); e.target.value = '' }} />
// //           <button onClick={() => fileRef.current?.click()} title="Attach MIDI to alter" style={{
// //             width: 34, height: 34, borderRadius: 9, flexShrink: 0,
// //             background: file ? 'rgba(96,213,245,0.1)' : 'none',
// //             border: `1px solid ${file ? 'rgba(96,213,245,0.25)' : 'transparent'}`,
// //             cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
// //             color: file ? 'var(--a2)' : 'var(--t3)',
// //             transition: 'all 0.12s', alignSelf: 'flex-end', marginBottom: 1,
// //           }}
// //             onMouseEnter={e => { if (!file) { e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'var(--s2)' } }}
// //             onMouseLeave={e => { if (!file) { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none' } }}
// //           >
// //             {ic('M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48', 15)}
// //           </button>

// //           {/* Textarea */}
// //           <textarea
// //             ref={textRef}
// //             value={input}
// //             onChange={e => setInput(e.target.value)}
// //             onKeyDown={onKey}
// //             disabled={generating}
// //             placeholder={isAlter
// //               ? 'Describe what layers to add…'
// //               : 'Describe your composition — key, mood, tempo, style…'
// //             }
// //             rows={1}
// //             style={{
// //               flex: 1, background: 'none', border: 'none', outline: 'none',
// //               color: 'var(--t1)', fontSize: 13, lineHeight: 1.55,
// //               resize: 'none', fontFamily: 'var(--font)',
// //               padding: '8px 10px', minHeight: 34, maxHeight: 120,
// //             }}
// //           />

// //           {/* Send */}
// //           <button onClick={send} disabled={!canSend} style={{
// //             width: 34, height: 34, borderRadius: 9, flexShrink: 0,
// //             background: canSend
// //               ? isAlter ? 'var(--a2)' : 'var(--a1)'
// //               : 'var(--s2)',
// //             border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
// //             display: 'flex', alignItems: 'center', justifyContent: 'center',
// //             color: canSend ? '#000' : 'var(--t3)',
// //             transition: 'all 0.12s', alignSelf: 'flex-end', marginBottom: 1,
// //           }}
// //             onMouseEnter={e => { if (canSend) e.currentTarget.style.opacity = '0.85' }}
// //             onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
// //           >
// //             {generating
// //               ? <Spinner size={13} color={canSend ? '#000' : 'var(--t3)'} />
// //               : ic('M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z', 14)
// //             }
// //           </button>
// //         </div>

// //         {/* Bottom hint */}
// //         <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '0 2px' }}>
// //           <div style={{ fontSize: 10, color: 'var(--t4)', fontFamily: 'var(--mono)' }}>
// //             {isAlter ? '📎 alter mode active' : '↵ send  ·  ⇧↵ newline  ·  📎 attach MIDI to alter'}
// //           </div>
// //           {messages.length > 0 && !generating && (
// //             <button onClick={clear} style={{
// //               fontSize: 10, color: 'var(--t4)', background: 'none',
// //               border: 'none', cursor: 'pointer', fontFamily: 'var(--mono)',
// //               transition: 'color 0.1s',
// //             }}
// //               onMouseEnter={e => e.currentTarget.style.color = 'var(--t2)'}
// //               onMouseLeave={e => e.currentTarget.style.color = 'var(--t4)'}
// //             >
// //               clear
// //             </button>
// //           )}
// //         </div>
// //       </div>
// //     </div>
// //   )
// // }
















// import { useState, useRef, useEffect } from 'react'
// import { useCompose } from '../hooks/useCompose.js'

// const Ic = ({ d, size = 15, sw = 1.7 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
//     stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
//     <path d={d} />
//   </svg>
// )

// const COMPOSE_CHIPS = [
//   'Cinematic piano, B minor, 76 BPM, 16 bars',
//   'Dark orchestral loop, Dm, 85 BPM, 8 bars',
//   'Emotional solo piano, Am, slow, 12 bars',
//   'Thriller underscore, minimal, 10 bars',
// ]
// const ALTER_CHIPS = [
//   'Add warm chord harmony following the melody',
//   'Add a walking bass line',
//   'Add lush string pads behind the melody',
//   'Add a countermelody between the notes',
// ]

// /* ── Mini components ──────────────────────────────────────────────────────── */

// function Dot({ delay = 0 }) {
//   return <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--lime)', animation: `pulse 1.1s ${delay}s ease-in-out infinite` }} />
// }

// function ThinkingBubble() {
//   return (
//     <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
//       <AiAvatar />
//       <div style={{
//         padding: '12px 16px', borderRadius: 12, borderTopLeftRadius: 3,
//         background: 'var(--card)', border: '1px solid var(--line)',
//         display: 'flex', flexDirection: 'column', gap: 8,
//       }}>
//         <div style={{ display: 'flex', gap: 5 }}>
//           <Dot delay={0} /><Dot delay={0.15} /><Dot delay={0.3} />
//         </div>
//         <div style={{ height: 2, width: 80, background: 'var(--raised)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
//           <div style={{ position: 'absolute', top: 0, height: '100%', background: 'var(--lime)', borderRadius: 2, animation: 'genBar 1.5s ease-in-out infinite' }} />
//         </div>
//       </div>
//     </div>
//   )
// }

// function AiAvatar() {
//   return (
//     <div style={{
//       width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
//       background: 'rgba(184,245,74,0.1)', border: '1px solid rgba(184,245,74,0.25)',
//       display: 'flex', alignItems: 'center', justifyContent: 'center',
//       color: 'var(--lime)', fontSize: 10, fontWeight: 700, fontFamily: 'var(--mono)',
//       marginTop: 1,
//     }}>
//       AI
//     </div>
//   )
// }

// function MidiCard({ midi }) {
//   const dl = () => {
//     const a = document.createElement('a')
//     a.href = midi.url; a.download = midi.name
//     document.body.appendChild(a); a.click(); document.body.removeChild(a)
//   }
//   const isAlt = midi.altered
//   return (
//     <div style={{
//       marginTop: 10, display: 'flex', alignItems: 'center', gap: 12,
//       padding: '12px 14px',
//       background: 'var(--surface)', border: '1px solid var(--line)',
//       borderRadius: 10, transition: 'border-color 0.15s',
//     }}
//       onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line-hi)'}
//       onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
//     >
//       <div style={{
//         width: 36, height: 36, borderRadius: 9, flexShrink: 0,
//         background: isAlt ? 'rgba(74,184,245,0.1)' : 'rgba(184,245,74,0.1)',
//         border: `1px solid ${isAlt ? 'rgba(74,184,245,0.25)' : 'rgba(184,245,74,0.25)'}`,
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         color: isAlt ? 'var(--sky)' : 'var(--lime)',
//       }}>
//         <Ic d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" size={16} />
//       </div>
//       <div style={{ flex: 1, minWidth: 0 }}>
//         <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
//           {midi.name}
//         </div>
//         <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
//           <span className="tag tag-lime">{midi.key}</span>
//           <span className="tag tag-dim">{midi.tempo} BPM</span>
//           <span className="tag tag-dim">{midi.bars} bars</span>
//           {isAlt && <span className="tag tag-sky">altered</span>}
//         </div>
//       </div>
//       <button onClick={dl} className="btn-primary" style={{ flexShrink: 0, padding: '7px 13px', fontSize: 11 }}>
//         <Ic d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" size={12} sw={2} />
//         Download
//       </button>
//     </div>
//   )
// }

// function Message({ msg }) {
//   const isUser = msg.role === 'user'
//   if (isUser) {
//     return (
//       <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeUp 0.2s ease' }}>
//         <div style={{ maxWidth: 'min(480px, 78%)' }}>
//           {msg.attached && (
//             <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 5 }}>
//               <span style={{
//                 display: 'inline-flex', alignItems: 'center', gap: 5,
//                 padding: '3px 9px', borderRadius: 5,
//                 background: 'rgba(74,184,245,0.08)', border: '1px solid rgba(74,184,245,0.2)',
//                 fontSize: 10, color: 'var(--sky)', fontFamily: 'var(--mono)',
//               }}>
//                 <Ic d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" size={11} />
//                 {msg.attached}
//               </span>
//             </div>
//           )}
//           <div style={{
//             padding: '10px 14px', borderRadius: 12, borderBottomRightRadius: 3,
//             background: 'var(--card)', border: '1px solid var(--line-md)',
//             fontSize: 13, lineHeight: 1.6, color: 'var(--tx-1)',
//           }}>
//             {msg.text}
//           </div>
//         </div>
//       </div>
//     )
//   }
//   return (
//     <div style={{ display: 'flex', gap: 10, animation: 'fadeUp 0.2s ease' }}>
//       <AiAvatar />
//       <div style={{ flex: 1, minWidth: 0, maxWidth: 'min(560px, calc(100% - 40px))', paddingTop: 4 }}>
//         <div style={{ fontSize: 13, lineHeight: 1.65, color: msg.error ? 'var(--rose)' : 'var(--tx-2)' }}>
//           {msg.text}
//         </div>
//         {msg.midi && <MidiCard midi={msg.midi} />}
//       </div>
//     </div>
//   )
// }

// function EmptyState({ onChip, isAlter }) {
//   const chips = isAlter ? ALTER_CHIPS : COMPOSE_CHIPS
//   return (
//     <div style={{
//       flex: 1, display: 'flex', flexDirection: 'column',
//       alignItems: 'center', justifyContent: 'center',
//       padding: '40px 24px', gap: 24, animation: 'fadeIn 0.4s ease',
//     }}>
//       {/* Icon mark
//       <div style={{
//         width: 56, height: 56, borderRadius: 16,
//         background: 'rgba(184,245,74,0.08)',
//         border: '1px solid rgba(184,245,74,0.2)',
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         color: 'var(--lime)',
//       }}>
//         <Ic d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" size={24} sw={1.5} />
//       </div> */}

//       <div style={{ textAlign: 'center', maxWidth: 440 }}>
//         <div style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 600, color: 'var(--tx-1)', letterSpacing: '-0.3px', marginBottom: 8 }}>
//           {isAlter ? 'Describe what to add' : 'What shall we compose?'}
//         </div>
//         <div style={{ fontSize: 13, color: 'var(--tx-3)', lineHeight: 1.7 }}>
//           {isAlter
//             ? 'Tell the AI what layers to add to your uploaded MIDI'
//             : 'Describe a mood, key, tempo, genre — or pick a suggestion below'
//           }
//         </div>
//       </div>

//       {/* Suggestion chips */}
//       <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, justifyContent: 'center', maxWidth: 500 }}>
//         {chips.map((c, i) => (
//           <button key={i} onClick={() => onChip(c)} style={{
//             padding: '7px 14px', borderRadius: 100,
//             border: '1px solid var(--line-md)',
//             background: 'var(--surface)', color: 'var(--tx-2)',
//             fontSize: 12, cursor: 'pointer',
//             fontFamily: 'var(--font)', transition: 'all 0.12s',
//           }}
//             onMouseEnter={e => {
//               e.currentTarget.style.borderColor = isAlter ? 'rgba(74,184,245,0.45)' : 'rgba(184,245,74,0.45)'
//               e.currentTarget.style.color = isAlter ? 'var(--sky)' : 'var(--lime)'
//               e.currentTarget.style.background = isAlter ? 'rgba(74,184,245,0.06)' : 'rgba(184,245,74,0.06)'
//             }}
//             onMouseLeave={e => {
//               e.currentTarget.style.borderColor = 'var(--line-md)'
//               e.currentTarget.style.color = 'var(--tx-2)'
//               e.currentTarget.style.background = 'var(--surface)'
//             }}
//           >
//             {c}
//           </button>
//         ))}
//       </div>
//     </div>
//   )
// }

// /* ── Main ─────────────────────────────────────────────────────────────────── */
// export default function Compose() {
//   const { messages, generating, sendMessage, clear } = useCompose()
//   const [input,  setInput]  = useState('')
//   const [file,   setFile]   = useState(null)
//   const scrollRef = useRef(null)
//   const textRef   = useRef(null)
//   const fileRef   = useRef(null)

//   useEffect(() => {
//     if (scrollRef.current)
//       scrollRef.current.scrollTop = scrollRef.current.scrollHeight
//   }, [messages, generating])

//   const send = () => {
//     if (!input.trim() || generating) return
//     sendMessage(input.trim(), file)
//     setInput(''); setFile(null)
//     if (textRef.current) textRef.current.style.height = 'auto'
//   }
//   const onKey = e => {
//     if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
//     if (textRef.current) {
//       textRef.current.style.height = 'auto'
//       textRef.current.style.height = Math.min(textRef.current.scrollHeight, 120) + 'px'
//     }
//   }

//   const isAlter = !!file
//   const canSend = !!input.trim() && !generating

//   return (
//     <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>

//       {/* Messages */}
//       <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
//         {messages.length === 0 && !generating
//           ? <EmptyState onChip={t => { setInput(t); textRef.current?.focus() }} isAlter={isAlter} />
//           : (
//             <div style={{ padding: '20px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
//               {messages.map(m => <Message key={m.id} msg={m} />)}
//               {generating && <ThinkingBubble />}
//             </div>
//           )
//         }
//       </div>

//       {/* File pill */}
//       {file && (
//         <div style={{ padding: '0 16px 6px', animation: 'fadeUp 0.15s ease' }}>
//           <div style={{
//             display: 'inline-flex', alignItems: 'center', gap: 7,
//             padding: '5px 10px 5px 12px',
//             background: 'rgba(74,184,245,0.08)',
//             border: '1px solid rgba(74,184,245,0.25)',
//             borderRadius: 7, fontSize: 11, color: 'var(--sky)', fontFamily: 'var(--mono)',
//           }}>
//             <Ic d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" size={12} />
//             <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</span>
//             <span style={{ padding: '1px 5px', borderRadius: 3, background: 'rgba(74,184,245,0.15)', fontSize: 9, letterSpacing: 1, fontWeight: 600 }}>ALTER</span>
//             <button onClick={() => setFile(null)} style={{
//               background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)',
//               display: 'flex', padding: 1, marginLeft: 1, transition: 'color 0.1s',
//             }}
//               onMouseEnter={e => e.currentTarget.style.color = 'var(--rose)'}
//               onMouseLeave={e => e.currentTarget.style.color = 'var(--tx-3)'}
//             >
//               <Ic d="M18 6L6 18M6 6l12 12" size={13} />
//             </button>
//           </div>
//         </div>
//       )}

//       {/* Input area */}
//       <div style={{ padding: '8px 16px 16px', flexShrink: 0 }}>
//         <div style={{
//           display: 'flex', alignItems: 'flex-end', gap: 4,
//           background: 'var(--card)',
//           border: `1px solid ${isAlter ? 'rgba(74,184,245,0.35)' : 'var(--line-md)'}`,
//           borderRadius: 14, padding: '6px',
//           boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
//           transition: 'border-color 0.2s',
//         }}
//           onFocusCapture={e => { e.currentTarget.style.borderColor = isAlter ? 'rgba(74,184,245,0.6)' : 'var(--line-hi)' }}
//           onBlurCapture={e => { e.currentTarget.style.borderColor = isAlter ? 'rgba(74,184,245,0.35)' : 'var(--line-md)' }}
//         >
//           {/* Attach */}
//           <input ref={fileRef} type="file" accept=".mid,.midi" style={{ display: 'none' }}
//             onChange={e => { const f = e.target.files[0]; if (f) setFile(f); e.target.value = '' }} />
//           <button
//             onClick={() => fileRef.current?.click()}
//             title="Attach MIDI to alter"
//             style={{
//               width: 34, height: 34, borderRadius: 9, flexShrink: 0,
//               background: file ? 'rgba(74,184,245,0.12)' : 'transparent',
//               border: `1px solid ${file ? 'rgba(74,184,245,0.3)' : 'transparent'}`,
//               cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
//               color: file ? 'var(--sky)' : 'var(--tx-3)',
//               transition: 'all 0.12s', alignSelf: 'flex-end', marginBottom: 1,
//             }}
//             onMouseEnter={e => { if (!file) { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--tx-2)' } }}
//             onMouseLeave={e => { if (!file) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-3)' } }}
//           >
//             <Ic d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" size={15} />
//           </button>

//           {/* Textarea */}
//           <textarea
//             ref={textRef}
//             value={input}
//             onChange={e => setInput(e.target.value)}
//             onKeyDown={onKey}
//             disabled={generating}
//             placeholder={isAlter ? 'Describe what layers to add…' : 'Describe your composition — key, mood, tempo, genre…'}
//             rows={1}
//             style={{
//               flex: 1, background: 'none', border: 'none', outline: 'none',
//               color: 'var(--tx-1)', fontSize: 13, lineHeight: 1.6,
//               resize: 'none', fontFamily: 'var(--font)',
//               padding: '7px 8px', minHeight: 34, maxHeight: 120,
//             }}
//           />

//           {/* Send */}
//           <button onClick={send} disabled={!canSend} style={{
//             width: 34, height: 34, borderRadius: 9, flexShrink: 0,
//             background: canSend ? (isAlter ? 'var(--sky)' : 'var(--lime)') : 'var(--raised)',
//             border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
//             display: 'flex', alignItems: 'center', justifyContent: 'center',
//             color: canSend ? '#0d0f14' : 'var(--tx-3)',
//             transition: 'all 0.12s', alignSelf: 'flex-end', marginBottom: 1,
//           }}
//             onMouseEnter={e => { if (canSend) e.currentTarget.style.opacity = '0.85' }}
//             onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
//           >
//             {generating
//               ? <div style={{ width: 14, height: 14, border: '2px solid', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
//               : <Ic d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={14} sw={2} />
//             }
//           </button>
//         </div>

//         {/* Hint */}
//         <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 7, padding: '0 2px' }}>
//           <span style={{ fontSize: 10, color: 'var(--tx-4)', fontFamily: 'var(--mono)' }}>
//             {isAlter ? '⬡ alter mode — adds layers to your MIDI' : '↵ send · ⇧↵ newline · 📎 attach MIDI to alter'}
//           </span>
//           {messages.length > 0 && !generating && (
//             <button onClick={clear} style={{
//               fontSize: 10, color: 'var(--tx-3)', background: 'none', border: 'none',
//               cursor: 'pointer', fontFamily: 'var(--mono)', transition: 'color 0.1s',
//             }}
//               onMouseEnter={e => e.currentTarget.style.color = 'var(--tx-1)'}
//               onMouseLeave={e => e.currentTarget.style.color = 'var(--tx-3)'}
//             >
//               clear chat
//             </button>
//           )}
//         </div>
//       </div>
//     </div>
//   )
// }














import { useState, useRef, useEffect } from 'react'
import { useCompose } from '../hooks/useCompose.js'

const Ic = ({ d, size = 15, sw = 1.7 }) => (
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
  'Add lush string pads behind the melody',
  'Add a countermelody between the notes',
]

/* ── AI avatar ─────────────────────────────────────────────────────────────── */
function AiAvatar() {
  return (
    <div style={{
      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
      background: 'rgba(124,58,237,0.1)',
      border: '1px solid rgba(124,58,237,0.22)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      marginTop: 1,
    }}>
      {/* mini spectrum bars */}
      <svg width={13} height={13} viewBox="0 0 18 18" fill="none">
        <rect x="0"  y="9"  width="2.5" height="7"  rx="1.2" fill="#a78bfa" opacity="0.4"/>
        <rect x="4"  y="5"  width="2.5" height="11" rx="1.2" fill="#a78bfa" opacity="0.65"/>
        <rect x="8"  y="1"  width="2.5" height="15" rx="1.2" fill="#a78bfa"/>
        <rect x="12" y="6"  width="2.5" height="10" rx="1.2" fill="#a78bfa" opacity="0.6"/>
        <rect x="16" y="10" width="2.5" height="6"  rx="1.2" fill="#a78bfa" opacity="0.35"/>
      </svg>
    </div>
  )
}

/* ── Thinking indicator ─────────────────────────────────────────────────────── */
function ThinkingBubble() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <AiAvatar />
      <div style={{
        padding: '11px 14px', borderRadius: 12, borderTopLeftRadius: 3,
        background: 'var(--card)', border: '1px solid var(--line)',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <div style={{ display: 'flex', gap: 5 }}>
          {[0, 0.15, 0.3].map((d, i) => (
            <div key={i} style={{
              width: 5, height: 5, borderRadius: '50%', background: '#a78bfa',
              animation: `pulse 1.1s ${d}s ease-in-out infinite`,
            }} />
          ))}
        </div>
        <div style={{ height: 2, width: 72, background: 'var(--raised)', borderRadius: 2, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            position: 'absolute', top: 0, height: '100%', borderRadius: 2,
            background: 'linear-gradient(90deg, #7c3aed, #a78bfa)',
            animation: 'genBar 1.5s ease-in-out infinite',
          }} />
        </div>
      </div>
    </div>
  )
}

/* ── MIDI result card ───────────────────────────────────────────────────────── */
function MidiCard({ midi }) {
  const dl = () => {
    const a = document.createElement('a')
    a.href = midi.url; a.download = midi.name
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }
  const isAlt = midi.altered
  return (
    <div style={{
      marginTop: 10, display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px',
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 10, transition: 'border-color 0.15s',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line-hi)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
    >
      {/* spectrum icon */}
      <div style={{
        width: 34, height: 34, borderRadius: 8, flexShrink: 0,
        background: isAlt ? 'rgba(74,184,245,0.07)' : 'rgba(124,58,237,0.07)',
        border: `1px solid ${isAlt ? 'rgba(74,184,245,0.2)' : 'rgba(124,58,237,0.2)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={15} height={15} viewBox="0 0 18 18" fill="none">
          <rect x="0"  y="9"  width="2.5" height="7"  rx="1.2" fill={isAlt ? '#60d5f5' : '#a78bfa'} opacity="0.45"/>
          <rect x="4"  y="5"  width="2.5" height="11" rx="1.2" fill={isAlt ? '#60d5f5' : '#a78bfa'} opacity="0.7"/>
          <rect x="8"  y="1"  width="2.5" height="15" rx="1.2" fill={isAlt ? '#60d5f5' : '#a78bfa'}/>
          <rect x="12" y="6"  width="2.5" height="10" rx="1.2" fill={isAlt ? '#60d5f5' : '#a78bfa'} opacity="0.65"/>
          <rect x="16" y="10" width="2.5" height="6"  rx="1.2" fill={isAlt ? '#60d5f5' : '#a78bfa'} opacity="0.4"/>
        </svg>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 4 }}>
          {midi.name}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {[
            { l: midi.key,             c: '#a78bfa', bg: 'rgba(124,58,237,0.07)', br: 'rgba(124,58,237,0.2)' },
            { l: `${midi.tempo} BPM`,  c: 'var(--tx-2)', bg: 'var(--raised)', br: 'var(--line)' },
            { l: `${midi.bars} bars`,  c: 'var(--tx-2)', bg: 'var(--raised)', br: 'var(--line)' },
            ...(isAlt ? [{ l: 'altered', c: 'var(--sky)', bg: 'rgba(74,184,245,0.07)', br: 'rgba(74,184,245,0.2)' }] : []),
          ].map((t, i) => (
            <span key={i} style={{
              fontSize: 10, fontFamily: 'var(--mono)', fontWeight: 500,
              color: t.c, background: t.bg, border: `1px solid ${t.br}`,
              padding: '2px 7px', borderRadius: 4, display: 'inline-flex', alignItems: 'center',
            }}>{t.l}</span>
          ))}
        </div>
      </div>

      <button onClick={dl} style={{
        display: 'flex', alignItems: 'center', gap: 5,
        padding: '7px 13px', borderRadius: 8,
        background: 'linear-gradient(135deg, #7c3aed, #5b21b6)',
        color: '#fff', fontSize: 11, fontWeight: 600,
        border: 'none', cursor: 'pointer', flexShrink: 0,
        boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
        transition: 'opacity 0.12s',
      }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        <Ic d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" size={12} sw={2} />
        Download
      </button>
    </div>
  )
}

/* ── Message bubble ─────────────────────────────────────────────────────────── */
function Message({ msg }) {
  const isUser = msg.role === 'user'
  if (isUser) {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', animation: 'fadeUp 0.2s ease' }}>
        <div style={{ maxWidth: 'min(480px, 78%)' }}>
          {msg.attached && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 5 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 9px', borderRadius: 5,
                background: 'rgba(74,184,245,0.07)', border: '1px solid rgba(74,184,245,0.2)',
                fontSize: 10, color: 'var(--sky)', fontFamily: 'var(--mono)',
              }}>
                <Ic d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" size={11} />
                {msg.attached}
              </span>
            </div>
          )}
          <div style={{
            padding: '10px 14px', borderRadius: 12, borderBottomRightRadius: 3,
            background: 'var(--card)', border: '1px solid var(--line-md)',
            fontSize: 13, lineHeight: 1.6, color: 'var(--tx-1)',
          }}>
            {msg.text}
          </div>
        </div>
      </div>
    )
  }
  return (
    <div style={{ display: 'flex', gap: 10, animation: 'fadeUp 0.2s ease' }}>
      <AiAvatar />
      <div style={{ flex: 1, minWidth: 0, maxWidth: 'min(560px, calc(100% - 40px))', paddingTop: 4 }}>
        <div style={{ fontSize: 13, lineHeight: 1.65, color: msg.error ? 'var(--rose)' : 'var(--tx-2)' }}>
          {msg.text}
        </div>
        {msg.midi && <MidiCard midi={msg.midi} />}
      </div>
    </div>
  )
}

/* ── Empty state — clean, chips hidden behind a toggle ──────────────────────── */
function EmptyState({ onChip, isAlter }) {
  const [open, setOpen] = useState(false)
  const chips = isAlter ? ALTER_CHIPS : COMPOSE_CHIPS

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px 24px', gap: 20,
      animation: 'fadeIn 0.35s ease',
    }}>

      {/* Heading */}
      <div style={{ textAlign: 'center', maxWidth: 380 }}>
        <div style={{
          fontSize: 'clamp(18px, 2.5vw, 22px)', fontWeight: 600,
          color: 'var(--tx-1)', letterSpacing: '-0.3px', marginBottom: 7,
          lineHeight: 1.25,
        }}>
          {isAlter ? 'Describe what to add' : 'What shall we compose?'}
        </div>
        <div style={{ fontSize: 13, color: 'var(--tx-3)', lineHeight: 1.7 }}>
          {isAlter
            ? 'Tell the AI what layers to add to your uploaded MIDI'
            : 'Type a mood, key, tempo or genre below'
          }
        </div>
      </div>

      {/* Suggestions toggle */}
      {!open ? (
        <button onClick={() => setOpen(true)} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '6px 14px', borderRadius: 20,
          background: 'none', border: '1px solid var(--line)',
          color: 'var(--tx-3)', fontSize: 11, cursor: 'pointer',
          fontFamily: 'var(--mono)', letterSpacing: '0.3px',
          transition: 'all 0.15s',
        }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-hi)'; e.currentTarget.style.color = 'var(--tx-2)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--tx-3)' }}
        >
          <Ic d="M12 5v14M5 12h14" size={10} sw={2} />
          suggestions
        </button>
      ) : (
        <div style={{
          width: '100%', maxWidth: 420,
          animation: 'fadeUp 0.18s ease',
          display: 'flex', flexDirection: 'column', gap: 8,
        }}>
          {/* header row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
            <span style={{ fontSize: 9, color: 'var(--tx-3)', fontFamily: 'var(--mono)', letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              suggestions
            </span>
            <button onClick={() => setOpen(false)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--tx-3)', display: 'flex', padding: 3, borderRadius: 5,
              transition: 'color 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--tx-1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--tx-3)'}
            >
              <Ic d="M18 6L6 18M6 6l12 12" size={13} />
            </button>
          </div>

          {/* chip list — stacked rows feel more intentional than scattered pills */}
          {chips.map((c, i) => (
            <button key={i} onClick={() => { onChip(c); setOpen(false) }} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10,
              padding: '9px 14px', borderRadius: 9, textAlign: 'left',
              border: '1px solid var(--line)',
              background: 'var(--surface)', color: 'var(--tx-2)',
              fontSize: 12, cursor: 'pointer',
              fontFamily: 'var(--font)', transition: 'all 0.12s',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'rgba(124,58,237,0.38)'
                e.currentTarget.style.color = '#a78bfa'
                e.currentTarget.style.background = 'rgba(124,58,237,0.05)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--line)'
                e.currentTarget.style.color = 'var(--tx-2)'
                e.currentTarget.style.background = 'var(--surface)'
              }}
            >
              <span>{c}</span>
              <Ic d="M5 12h14M12 5l7 7-7 7" size={12} sw={1.5} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main ───────────────────────────────────────────────────────────────────── */
export default function Compose() {
  const { messages, generating, sendMessage, clear } = useCompose()
  const [input,  setInput]  = useState('')
  const [file,   setFile]   = useState(null)
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

      {/* Messages */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
        {messages.length === 0 && !generating
          ? <EmptyState onChip={t => { setInput(t); textRef.current?.focus() }} isAlter={isAlter} />
          : (
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {messages.map(m => <Message key={m.id} msg={m} />)}
              {generating && <ThinkingBubble />}
            </div>
          )
        }
      </div>

      {/* File pill */}
      {file && (
        <div style={{ padding: '0 16px 6px', animation: 'fadeUp 0.15s ease' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '5px 10px 5px 12px',
            background: 'rgba(74,184,245,0.07)', border: '1px solid rgba(74,184,245,0.22)',
            borderRadius: 7, fontSize: 11, color: 'var(--sky)', fontFamily: 'var(--mono)',
          }}>
            <svg width={11} height={11} viewBox="0 0 18 18" fill="none">
              <rect x="0"  y="9"  width="2.5" height="7"  rx="1.2" fill="currentColor" opacity="0.5"/>
              <rect x="4"  y="5"  width="2.5" height="11" rx="1.2" fill="currentColor" opacity="0.75"/>
              <rect x="8"  y="1"  width="2.5" height="15" rx="1.2" fill="currentColor"/>
              <rect x="12" y="6"  width="2.5" height="10" rx="1.2" fill="currentColor" opacity="0.7"/>
              <rect x="16" y="10" width="2.5" height="6"  rx="1.2" fill="currentColor" opacity="0.45"/>
            </svg>
            <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {file.name}
            </span>
            <span style={{ padding: '1px 5px', borderRadius: 3, background: 'rgba(74,184,245,0.14)', fontSize: 9, letterSpacing: 1, fontWeight: 600 }}>
              ALTER
            </span>
            <button onClick={() => setFile(null)} style={{
              background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)',
              display: 'flex', padding: 1, marginLeft: 1, transition: 'color 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--rose)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--tx-3)'}
            >
              <Ic d="M18 6L6 18M6 6l12 12" size={13} />
            </button>
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div style={{ padding: '8px 16px 16px', flexShrink: 0 }}>
        <div style={{
          display: 'flex', alignItems: 'flex-end', gap: 4,
          background: 'var(--card)',
          border: `1px solid ${isAlter ? 'rgba(74,184,245,0.32)' : 'var(--line-md)'}`,
          borderRadius: 14, padding: '6px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.3)',
          transition: 'border-color 0.2s',
        }}
          onFocusCapture={e => { e.currentTarget.style.borderColor = isAlter ? 'rgba(74,184,245,0.55)' : 'rgba(124,58,237,0.4)' }}
          onBlurCapture={e => { e.currentTarget.style.borderColor = isAlter ? 'rgba(74,184,245,0.32)' : 'var(--line-md)' }}
        >
          {/* Attach */}
          <input ref={fileRef} type="file" accept=".mid,.midi" style={{ display: 'none' }}
            onChange={e => { const f = e.target.files[0]; if (f) setFile(f); e.target.value = '' }} />
          <button
            onClick={() => fileRef.current?.click()}
            title="Attach MIDI to alter"
            style={{
              width: 34, height: 34, borderRadius: 9, flexShrink: 0,
              background: file ? 'rgba(74,184,245,0.1)' : 'transparent',
              border: `1px solid ${file ? 'rgba(74,184,245,0.28)' : 'transparent'}`,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: file ? 'var(--sky)' : 'var(--tx-3)',
              transition: 'all 0.12s', alignSelf: 'flex-end', marginBottom: 1,
            }}
            onMouseEnter={e => { if (!file) { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--tx-2)' } }}
            onMouseLeave={e => { if (!file) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--tx-3)' } }}
          >
            <Ic d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" size={15} />
          </button>

          {/* Textarea */}
          <textarea
            ref={textRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKey}
            disabled={generating}
            placeholder={isAlter ? 'Describe what layers to add…' : 'Describe your composition — key, mood, tempo, genre…'}
            rows={1}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: 'var(--tx-1)', fontSize: 13, lineHeight: 1.6,
              resize: 'none', fontFamily: 'var(--font)',
              padding: '7px 8px', minHeight: 34, maxHeight: 120,
            }}
          />

          {/* Send */}
          <button onClick={send} disabled={!canSend} style={{
            width: 34, height: 34, borderRadius: 9, flexShrink: 0,
            background: canSend
              ? isAlter ? 'var(--sky)' : 'linear-gradient(135deg, #7c3aed, #5b21b6)'
              : 'var(--raised)',
            border: 'none', cursor: canSend ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: canSend ? (isAlter ? '#0d0f14' : '#fff') : 'var(--tx-3)',
            transition: 'all 0.12s', alignSelf: 'flex-end', marginBottom: 1,
            boxShadow: canSend ? '0 4px 14px rgba(124,58,237,0.35)' : 'none',
          }}
            onMouseEnter={e => { if (canSend) e.currentTarget.style.opacity = '0.85' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {generating
              ? <div style={{ width: 14, height: 14, border: '2px solid', borderColor: isAlter ? '#0d0f14' : '#fff', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
              : <Ic d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" size={14} sw={2} />
            }
          </button>
        </div>

        {/* Hint row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, padding: '0 2px' }}>
          <span style={{ fontSize: 10, color: 'var(--tx-4)', fontFamily: 'var(--mono)' }}>
            {isAlter ? '⬡ alter mode — adds layers to your MIDI' : '↵ send · ⇧↵ newline · 📎 attach MIDI to alter'}
          </span>
          {messages.length > 0 && !generating && (
            <button onClick={clear} style={{
              fontSize: 10, color: 'var(--tx-3)', background: 'none', border: 'none',
              cursor: 'pointer', fontFamily: 'var(--mono)', transition: 'color 0.1s',
            }}
              onMouseEnter={e => e.currentTarget.style.color = 'var(--tx-1)'}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--tx-3)'}
            >
              clear chat
            </button>
          )}
        </div>
      </div>
    </div>
  )
}