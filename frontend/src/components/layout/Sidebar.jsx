// // // // //E:\pro\midigenerator_v2\frontend\src\components\layout\Sidebar.jsx
// // // // import { NavLink } from 'react-router-dom'

// // // // const I = ({ d, size = 15 }) => (
// // // //   <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
// // // //     stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
// // // //     <path d={d} />
// // // //   </svg>
// // // // )

// // // // const NAV = [
// // // //   { to: '/compose',   label: 'Compose',   d: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
// // // //   { to: '/knowledge', label: 'Knowledge', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z' },
// // // //   { to: '/history',   label: 'History',   d: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
// // // //   { to: '/tools',     label: 'Tools',     d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
// // // // ]

// // // // export default function Sidebar() {
// // // //   return (
// // // //     <aside className="sidebar">
// // // //       {/* Wordmark */}
// // // //       <div style={{ padding: '26px 22px 22px', borderBottom: '1px solid var(--b1)' }}>
// // // //         <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--t1)', lineHeight: 1.1, fontStyle: 'italic' }}>
// // // //           Midi<span style={{ color: 'var(--a1)', fontStyle: 'normal' }}>Gen</span>
// // // //         </div>
// // // //         <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 5, letterSpacing: 2, textTransform: 'uppercase' }}>
// // // //           AI Composer
// // // //         </div>
// // // //       </div>

// // // //       {/* Nav */}
// // // //       <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
// // // //         {NAV.map(({ to, label, d }) => (
// // // //           <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
// // // //             {({ isActive }) => (
// // // //               <div style={{
// // // //                 display: 'flex', alignItems: 'center', gap: 9,
// // // //                 padding: '8px 14px', borderRadius: 8,
// // // //                 color: isActive ? 'var(--t1)' : 'var(--t3)',
// // // //                 background: isActive ? 'var(--s2)' : 'transparent',
// // // //                 fontSize: 13, fontWeight: isActive ? 500 : 400,
// // // //                 cursor: 'pointer', transition: 'all 0.12s',
// // // //                 position: 'relative',
// // // //               }}>
// // // //                 {isActive && (
// // // //                   <div style={{
// // // //                     position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
// // // //                     width: 3, height: 16, borderRadius: '0 2px 2px 0',
// // // //                     background: 'var(--a1)',
// // // //                   }} />
// // // //                 )}
// // // //                 <I d={d} size={14} />
// // // //                 {label}
// // // //               </div>
// // // //             )}
// // // //           </NavLink>
// // // //         ))}
// // // //       </nav>

// // // //       {/* Status */}
// // // //       <div style={{ padding: '14px 22px', borderTop: '1px solid var(--b1)' }}>
// // // //         <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
// // // //           <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 6px var(--ok)', animation: 'pulse 3s ease-in-out infinite' }} />
// // // //           online
// // // //         </div>
// // // //       </div>
// // // //     </aside>
// // // //   )
// // // // }














// // // import { NavLink } from 'react-router-dom'

// // // const Ic = ({ d, size = 16 }) => (
// // //   <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
// // //     stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
// // //     <path d={d} />
// // //   </svg>
// // // )

// // // const NAV = [
// // //   { to: '/compose',   label: 'Compose',   d: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
// // //   { to: '/knowledge', label: 'Knowledge', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z' },
// // //   { to: '/history',   label: 'History',   d: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
// // //   { to: '/tools',     label: 'Tools',     d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
// // // ]

// // // export default function Sidebar() {
// // //   return (
// // //     <aside className="sidebar">

// // //       {/* Logo */}
// // //       <div style={{ padding: '22px 20px 18px', borderBottom: '1px solid var(--line)' }}>
// // //         <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
// // //           <div style={{
// // //             width: 30, height: 30, borderRadius: 8,
// // //             background: 'var(--lime)', display: 'flex',
// // //             alignItems: 'center', justifyContent: 'center', flexShrink: 0,
// // //           }}>
// // //             <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
// // //               stroke="#0d0f14" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
// // //               <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
// // //             </svg>
// // //           </div>
// // //           <div>
// // //             <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>
// // //               MidiGen
// // //             </div>
// // //             <div style={{ fontSize: 9, color: 'var(--tx-3)', fontFamily: 'var(--mono)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 1 }}>
// // //               AI Studio
// // //             </div>
// // //           </div>
// // //         </div>
// // //       </div>

// // //       {/* Navigation */}
// // //       <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
// // //         {NAV.map(({ to, label, d }) => (
// // //           <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
// // //             {({ isActive }) => (
// // //               <div style={{
// // //                 display: 'flex', alignItems: 'center', gap: 9,
// // //                 padding: '9px 12px', borderRadius: 8,
// // //                 color: isActive ? 'var(--tx-1)' : 'var(--tx-3)',
// // //                 background: isActive ? 'var(--card)' : 'transparent',
// // //                 border: `1px solid ${isActive ? 'var(--line-md)' : 'transparent'}`,
// // //                 fontSize: 13, fontWeight: isActive ? 500 : 400,
// // //                 cursor: 'pointer', transition: 'all 0.12s',
// // //               }}
// // //                 onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--tx-2)'; e.currentTarget.style.background = 'var(--raised)' } }}
// // //                 onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--tx-3)'; e.currentTarget.style.background = 'transparent' } }}
// // //               >
// // //                 <span style={{ color: isActive ? 'var(--lime)' : 'inherit', display: 'flex' }}>
// // //                   <Ic d={d} size={14} />
// // //                 </span>
// // //                 {label}
// // //               </div>
// // //             )}
// // //           </NavLink>
// // //         ))}
// // //       </nav>

// // //       {/* Status footer */}
// // //       <div style={{ padding: '14px 20px', borderTop: '1px solid var(--line)' }}>
// // //         <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
// // //           <div style={{
// // //             width: 6, height: 6, borderRadius: '50%',
// // //             background: 'var(--mint)',
// // //             boxShadow: '0 0 8px var(--mint)',
// // //             animation: 'pulse 3s ease-in-out infinite',
// // //           }} />
// // //           <span style={{ fontSize: 10, color: 'var(--tx-3)', fontFamily: 'var(--mono)' }}>connected</span>
// // //         </div>
// // //       </div>
// // //     </aside>
// // //   )
// // // }










// // import { useState } from 'react'
// // import { NavLink } from 'react-router-dom'

// // const Ic = ({ d, size = 16 }) => (
// //   <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
// //     stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
// //     <path d={d} />
// //   </svg>
// // )

// // const NAV = [
// //   { to: '/compose',   label: 'Compose',   d: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
// //   { to: '/knowledge', label: 'Knowledge', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z' },
// //   { to: '/history',   label: 'History',   d: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
// //   { to: '/tools',     label: 'Tools',     d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
// // ]

// // // Spectrum-bar logo — unique, not a generic music icon
// // function SpectrumMark() {
// //   return (
// //     <svg width={18} height={18} viewBox="0 0 18 18" fill="none">
// //       <rect x="0"  y="9"  width="2.5" height="7"  rx="1.2" fill="currentColor" opacity="0.4"/>
// //       <rect x="4"  y="5"  width="2.5" height="11" rx="1.2" fill="currentColor" opacity="0.65"/>
// //       <rect x="8"  y="1"  width="2.5" height="15" rx="1.2" fill="currentColor"/>
// //       <rect x="12" y="6"  width="2.5" height="10" rx="1.2" fill="currentColor" opacity="0.6"/>
// //       <rect x="16" y="10" width="2.5" height="6"  rx="1.2" fill="currentColor" opacity="0.35"/>
// //     </svg>
// //   )
// // }

// // export default function Sidebar() {
// //   const [collapsed, setCollapsed] = useState(false)

// //   const W = collapsed ? 56 : 212

// //   return (
// //     <aside style={{
// //       width: W, minWidth: W,
// //       transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
// //       background: 'var(--surface)', borderRight: '1px solid var(--line)',
// //       display: 'flex', flexDirection: 'column',
// //       overflow: 'hidden', flexShrink: 0, height: '100%', zIndex: 10,
// //     }}>

// //       {/* ── Header ── */}
// //       <div style={{
// //         padding: collapsed ? '16px 0' : '16px 14px',
// //         display: 'flex', alignItems: 'center',
// //         justifyContent: collapsed ? 'center' : 'space-between',
// //         gap: 8, flexShrink: 0,
// //         transition: 'padding 0.22s',
// //       }}>
// //                {/* Logo */}
// //        <div style={{ padding: '22px 20px 18px',  }}>
// //          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
// //            <div style={{
// //             width: 30, height: 30, borderRadius: 8,
// //             background: 'var(--lime)', display: 'flex',
// //             alignItems: 'center', justifyContent: 'center', flexShrink: 0,
// //           }}>
// //             <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
// //               stroke="#0d0f14" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
// //               <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
// //             </svg>
// //           </div>
// //           <div>
// //             <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px' }}>
// //               MidiGen
// //             </div>
// //             <div style={{ fontSize: 9, color: 'var(--tx-3)', fontFamily: 'var(--mono)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 1 }}>
// //               AI Studio
// //             </div>
// //           </div>
// //         </div>
// //       </div>

// //         {/* Collapse toggle — only shown when expanded */}
// //         {!collapsed && (
// //           <button onClick={() => setCollapsed(true)} title="Collapse" style={{
// //             width: 24, height: 24, borderRadius: 6, flexShrink: 0,
// //             background: 'none', border: 'none', cursor: 'pointer',
// //             display: 'flex', alignItems: 'center', justifyContent: 'center',
// //             color: 'var(--tx-3)', transition: 'all 0.12s',
// //           }}
// //             onMouseEnter={e => { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--tx-1)' }}
// //             onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--tx-3)' }}
// //           >
// //             {/* chevron left */}
// //             <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// //               <path d="M15 18l-6-6 6-6" />
// //             </svg>
// //           </button>
// //         )}
// //       </div>

// //       {/* ── Expand button when collapsed ── */}
// //       {collapsed && (
// //         <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0 4px' }}>
// //           <button onClick={() => setCollapsed(false)} title="Expand" style={{
// //             width: 28, height: 28, borderRadius: 7,
// //             background: 'none', border: 'none', cursor: 'pointer',
// //             display: 'flex', alignItems: 'center', justifyContent: 'center',
// //             color: 'var(--tx-3)', transition: 'all 0.12s',
// //           }}
// //             onMouseEnter={e => { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--tx-1)' }}
// //             onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--tx-3)' }}
// //           >
// //             <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
// //               <path d="M9 18l6-6-6-6" />
// //             </svg>
// //           </button>
// //         </div>
// //       )}

// //       {/* ── Nav ── */}
// //       <nav style={{
// //         flex: 1,
// //         padding: collapsed ? '8px 6px' : '10px 8px',
// //         display: 'flex', flexDirection: 'column', gap: 1,
// //         transition: 'padding 0.22s',
// //       }}>
// //         {NAV.map(({ to, label, d }) => (
// //           <NavLink key={to} to={to} style={{ textDecoration: 'none' }} title={collapsed ? label : undefined}>
// //             {({ isActive }) => (
// //               <div style={{
// //                 display: 'flex', alignItems: 'center',
// //                 gap: collapsed ? 0 : 9,
// //                 padding: collapsed ? '9px 0' : '9px 12px',
// //                 justifyContent: collapsed ? 'center' : 'flex-start',
// //                 borderRadius: 8,
// //                 color: isActive ? 'var(--tx-1)' : 'var(--tx-3)',
// //                 background: isActive ? 'var(--card)' : 'transparent',
// //                 border: `1px solid ${isActive ? 'var(--line-md)' : 'transparent'}`,
// //                 fontSize: 13, fontWeight: isActive ? 500 : 400,
// //                 cursor: 'pointer', transition: 'all 0.12s',
// //               }}
// //                 onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--tx-2)'; e.currentTarget.style.background = 'var(--raised)' } }}
// //                 onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--tx-3)'; e.currentTarget.style.background = 'transparent' } }}
// //               >
// //                 <span style={{ color: isActive ? 'var(--lime)' : 'inherit', display: 'flex', flexShrink: 0 }}>
// //                   <Ic d={d} size={15} />
// //                 </span>
// //                 {!collapsed && label}
// //               </div>
// //             )}
// //           </NavLink>
// //         ))}
// //       </nav>

// //       {/* ── Status footer ── */}
// //       <div style={{
// //         padding: collapsed ? '12px 0' : '13px 18px',
// //         borderTop: '1px solid var(--line)',
// //         display: 'flex', alignItems: 'center',
// //         justifyContent: collapsed ? 'center' : 'flex-start',
// //         gap: 7, flexShrink: 0,
// //         transition: 'padding 0.22s',
// //       }}>
// //         <div style={{
// //           width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
// //           background: 'var(--mint)', boxShadow: '0 0 8px var(--mint)',
// //           animation: 'pulse 3s ease-in-out infinite',
// //         }} />
// //         {!collapsed && (
// //           <span style={{ fontSize: 10, color: 'var(--tx-3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
// //             connected
// //           </span>
// //         )}
// //       </div>
// //     </aside>
// //   )
// // }











// import { useState } from 'react'
// import { NavLink } from 'react-router-dom'
// import { PanelRightClose, PanelRightOpen } from 'lucide-react'

// const Ic = ({ d, size = 16 }) => (
//   <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
//     stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
//     <path d={d} />
//   </svg>
// )

// const NAV = [
//   { to: '/compose',   label: 'Compose',   d: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
//   { to: '/knowledge', label: 'Knowledge', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z' },
//   { to: '/history',   label: 'History',   d: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
//   { to: '/tools',     label: 'Tools',     d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
// ]

// export default function Sidebar() {
//   const [collapsed, setCollapsed] = useState(false)

//   const W = collapsed ? 56 : 212

//   return (
//     <>
//       {/* ── Responsive styles ── */}
//       <style>{`
//         .sidebar-aside {
//           width: ${W}px;
//           min-width: ${W}px;
//         }
//         /* On tablet/mobile hide sidebar entirely, bottom nav takes over */
//         @media (max-width: 768px) {
//           .sidebar-aside { display: none !important; }
//         }
//       `}</style>

//       <aside className="sidebar-aside" style={{
//         transition: 'width 0.22s cubic-bezier(.4,0,.2,1), min-width 0.22s cubic-bezier(.4,0,.2,1)',
//         background: 'var(--surface)',
//         borderRight: '1px solid var(--line)',
//         display: 'flex', flexDirection: 'column',
//         overflow: 'hidden', flexShrink: 0, height: '100%', zIndex: 10,
//       }}>

//         {/* ── Header ── */}
//         <div style={{
//           padding: collapsed ? '16px 0' : '16px 14px',
//           borderBottom: '1px solid var(--line)',
//           display: 'flex', alignItems: 'center',
//           justifyContent: collapsed ? 'center' : 'space-between',
//           gap: 8, flexShrink: 0,
//           transition: 'padding 0.22s',
//         }}>

//           {/* Logo mark + wordmark */}
//           <div style={{ display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden', minWidth: 0 }}>
//             <div style={{
//               width: 30, height: 30, borderRadius: 8, flexShrink: 0,
//               background: 'var(--lime)',
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//             }}>
//               <svg width={16} height={16} viewBox="0 0 24 24" fill="none"
//                 stroke="#0d0f14" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
//                 <path d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" />
//               </svg>
//             </div>

//             {!collapsed && (
//               <div style={{ overflow: 'hidden', minWidth: 0 }}>
//                 <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--tx-1)', letterSpacing: '-0.2px', whiteSpace: 'nowrap' }}>
//                   MidiGen
//                 </div>
//                 <div style={{ fontSize: 9, color: 'var(--tx-3)', fontFamily: 'var(--mono)', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 1 }}>
//                   AI Studio
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Toggle button */}
//           <button
//             onClick={() => setCollapsed(c => !c)}
//             title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
//             style={{
//               width: 26, height: 26, borderRadius: 6, flexShrink: 0,
//               background: 'none', border: 'none', cursor: 'pointer',
//               display: 'flex', alignItems: 'center', justifyContent: 'center',
//               color: 'var(--tx-3)', transition: 'all 0.12s',
//               // when collapsed the logo is centred; button sits right below it via flex column — but
//               // we keep it in header row, just always visible
//             }}
//             onMouseEnter={e => { e.currentTarget.style.background = 'var(--raised)'; e.currentTarget.style.color = 'var(--tx-1)' }}
//             onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'var(--tx-3)' }}
//           >
//             {collapsed
//               ? <PanelRightOpen  size={15} />
//               : <PanelRightClose size={15} />
//             }
//           </button>
//         </div>

//         {/* ── Nav ── */}
//         <nav style={{
//           flex: 1,
//           padding: collapsed ? '10px 6px' : '10px 8px',
//           display: 'flex', flexDirection: 'column', gap: 1,
//           transition: 'padding 0.22s',
//         }}>
//           {NAV.map(({ to, label, d }) => (
//             <NavLink key={to} to={to} style={{ textDecoration: 'none' }} title={collapsed ? label : undefined}>
//               {({ isActive }) => (
//                 <div style={{
//                   display: 'flex', alignItems: 'center',
//                   gap: collapsed ? 0 : 9,
//                   padding: collapsed ? '9px 0' : '9px 12px',
//                   justifyContent: collapsed ? 'center' : 'flex-start',
//                   borderRadius: 8,
//                   color: isActive ? 'var(--tx-1)' : 'var(--tx-3)',
//                   background: isActive ? 'var(--card)' : 'transparent',
//                   border: `1px solid ${isActive ? 'var(--line-md)' : 'transparent'}`,
//                   fontSize: 13, fontWeight: isActive ? 500 : 400,
//                   cursor: 'pointer', transition: 'all 0.12s',
//                 }}
//                   onMouseEnter={e => { if (!isActive) { e.currentTarget.style.color = 'var(--tx-2)'; e.currentTarget.style.background = 'var(--raised)' } }}
//                   onMouseLeave={e => { if (!isActive) { e.currentTarget.style.color = 'var(--tx-3)'; e.currentTarget.style.background = 'transparent' } }}
//                 >
//                   <span style={{ color: isActive ? 'var(--lime)' : 'inherit', display: 'flex', flexShrink: 0 }}>
//                     <Ic d={d} size={15} />
//                   </span>
//                   {!collapsed && label}
//                 </div>
//               )}
//             </NavLink>
//           ))}
//         </nav>

//         {/* ── Status footer ── */}
//         <div style={{
//           padding: collapsed ? '12px 0' : '13px 18px',
//           borderTop: '1px solid var(--line)',
//           display: 'flex', alignItems: 'center',
//           justifyContent: collapsed ? 'center' : 'flex-start',
//           gap: 7, flexShrink: 0,
//           transition: 'padding 0.22s',
//         }}>
//           <div style={{
//             width: 6, height: 6, borderRadius: '50%', flexShrink: 0,
//             background: 'var(--mint)', boxShadow: '0 0 8px var(--mint)',
//             animation: 'pulse 3s ease-in-out infinite',
//           }} />
//           {!collapsed && (
//             <span style={{ fontSize: 10, color: 'var(--tx-3)', fontFamily: 'var(--mono)', whiteSpace: 'nowrap' }}>
//               connected
//             </span>
//           )}
//         </div>
//       </aside>
//     </>
//   )
// }










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