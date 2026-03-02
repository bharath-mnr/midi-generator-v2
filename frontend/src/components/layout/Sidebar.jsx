// // // //E:\pro\midigenerator_v2\frontend\src\components\layout\Sidebar.jsx

// // // import { NavLink } from 'react-router-dom'
// // // import { Waveform, BookOpen, Clock, Wrench } from '../shared/Icons.jsx'

// // // const NAV = [
// // //   { to: '/compose',   label: 'Compose',   Icon: Waveform },
// // //   { to: '/knowledge', label: 'Knowledge', Icon: BookOpen },
// // //   { to: '/history',   label: 'History',   Icon: Clock    },
// // //   { to: '/tools',     label: 'Tools',     Icon: Wrench   },
// // // ]

// // // export default function Sidebar() {
// // //   return (
// // //     <aside className="sidebar">
// // //       <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
// // //         <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 1, color: 'var(--accent)', lineHeight: 1 }}>MIDI</div>
// // //         <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 1, color: 'var(--text)', lineHeight: 1 }}>GENERATOR</div>
// // //         <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--mono)', marginTop: 6 }}>AI Studio v2</div>
// // //       </div>

// // //       <nav style={{ padding: '12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
// // //         {NAV.map(({ to, label, Icon }) => (
// // //           <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
// // //             {({ isActive }) => (
// // //               <div style={{
// // //                 display: 'flex', alignItems: 'center', gap: 10,
// // //                 padding: '9px 12px', borderRadius: 'var(--r-sm)',
// // //                 cursor: 'pointer', transition: 'all 0.15s ease',
// // //                 color: isActive ? 'var(--accent)' : 'var(--text3)',
// // //                 fontSize: 13, fontWeight: isActive ? 600 : 400,
// // //                 background: isActive ? 'rgba(232,255,71,0.07)' : 'transparent',
// // //                 borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
// // //               }}>
// // //                 <Icon size={15} />
// // //                 <span>{label}</span>
// // //               </div>
// // //             )}
// // //           </NavLink>
// // //         ))}
// // //       </nav>

// // //       <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
// // //         <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
// // //           <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)', animation: 'pulse 2.5s ease-in-out infinite' }} />
// // //           connected
// // //         </div>
// // //       </div>
// // //     </aside>
// // //   )
// // // }









// // import { NavLink } from 'react-router-dom'
// // import { Waveform, BookOpen, Clock, Wrench, Scissors } from '../shared/Icons.jsx'

// // const NAV = [
// //   { to: '/compose',   label: 'Compose',   Icon: Waveform },
// //   { to: '/alter',     label: 'Alter',     Icon: Scissors },
// //   { to: '/knowledge', label: 'Knowledge', Icon: BookOpen },
// //   { to: '/history',   label: 'History',   Icon: Clock    },
// //   { to: '/tools',     label: 'Tools',     Icon: Wrench   },
// // ]

// // export default function Sidebar() {
// //   return (
// //     <aside className="sidebar">
// //       <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
// //         <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 1, color: 'var(--accent)', lineHeight: 1 }}>MIDI</div>
// //         <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 1, color: 'var(--text)', lineHeight: 1 }}>GENERATOR</div>
// //         <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--mono)', marginTop: 6 }}>AI Studio v2</div>
// //       </div>

// //       <nav style={{ padding: '12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
// //         {NAV.map(({ to, label, Icon }) => (
// //           <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
// //             {({ isActive }) => (
// //               <div style={{
// //                 display: 'flex', alignItems: 'center', gap: 10,
// //                 padding: '9px 12px', borderRadius: 'var(--r-sm)',
// //                 cursor: 'pointer', transition: 'all 0.15s ease',
// //                 color: isActive ? 'var(--accent)' : 'var(--text3)',
// //                 fontSize: 13, fontWeight: isActive ? 600 : 400,
// //                 background: isActive ? 'rgba(232,255,71,0.07)' : 'transparent',
// //                 borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
// //               }}>
// //                 <Icon size={15} />
// //                 <span>{label}</span>
// //               </div>
// //             )}
// //           </NavLink>
// //         ))}
// //       </nav>

// //       <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
// //         <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
// //           <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)', animation: 'pulse 2.5s ease-in-out infinite' }} />
// //           connected
// //         </div>
// //       </div>
// //     </aside>
// //   )
// // }










// import { NavLink } from 'react-router-dom'
// import { Waveform, BookOpen, Clock, Wrench } from '../shared/Icons.jsx'

// const NAV = [
//   { to: '/compose',   label: 'Compose',   Icon: Waveform },
//   { to: '/knowledge', label: 'Knowledge', Icon: BookOpen },
//   { to: '/history',   label: 'History',   Icon: Clock    },
//   { to: '/tools',     label: 'Tools',     Icon: Wrench   },
// ]

// export default function Sidebar() {
//   return (
//     <aside className="sidebar">
//       <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
//         <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 1, color: 'var(--accent)', lineHeight: 1 }}>MIDI</div>
//         <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 1, color: 'var(--text)', lineHeight: 1 }}>GENERATOR</div>
//         <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--mono)', marginTop: 6 }}>AI Studio v2</div>
//       </div>

//       <nav style={{ padding: '12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
//         {NAV.map(({ to, label, Icon }) => (
//           <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
//             {({ isActive }) => (
//               <div style={{
//                 display: 'flex', alignItems: 'center', gap: 10,
//                 padding: '9px 12px', borderRadius: 'var(--r-sm)',
//                 cursor: 'pointer', transition: 'all 0.15s ease',
//                 color: isActive ? 'var(--accent)' : 'var(--text3)',
//                 fontSize: 13, fontWeight: isActive ? 600 : 400,
//                 background: isActive ? 'rgba(232,255,71,0.07)' : 'transparent',
//                 borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
//               }}>
//                 <Icon size={15} />
//                 <span>{label}</span>
//               </div>
//             )}
//           </NavLink>
//         ))}
//       </nav>

//       <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
//         <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
//           <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)', animation: 'pulse 2.5s ease-in-out infinite' }} />
//           connected
//         </div>
//       </div>
//     </aside>
//   )
// }










import { NavLink } from 'react-router-dom'

const I = ({ d, size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
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
  return (
    <aside className="sidebar">
      {/* Wordmark */}
      <div style={{ padding: '26px 22px 22px', borderBottom: '1px solid var(--b1)' }}>
        <div style={{ fontFamily: 'var(--serif)', fontSize: 22, color: 'var(--t1)', lineHeight: 1.1, fontStyle: 'italic' }}>
          Midi<span style={{ color: 'var(--a1)', fontStyle: 'normal' }}>Gen</span>
        </div>
        <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 5, letterSpacing: 2, textTransform: 'uppercase' }}>
          AI Composer
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 1 }}>
        {NAV.map(({ to, label, d }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 14px', borderRadius: 8,
                color: isActive ? 'var(--t1)' : 'var(--t3)',
                background: isActive ? 'var(--s2)' : 'transparent',
                fontSize: 13, fontWeight: isActive ? 500 : 400,
                cursor: 'pointer', transition: 'all 0.12s',
                position: 'relative',
              }}>
                {isActive && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 16, borderRadius: '0 2px 2px 0',
                    background: 'var(--a1)',
                  }} />
                )}
                <I d={d} size={14} />
                {label}
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Status */}
      <div style={{ padding: '14px 22px', borderTop: '1px solid var(--b1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 6px var(--ok)', animation: 'pulse 3s ease-in-out infinite' }} />
          online
        </div>
      </div>
    </aside>
  )
}