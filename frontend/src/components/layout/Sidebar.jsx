// // //E:\pro\midigenerator_v2\frontend\src\components\layout\Sidebar.jsx

// // import { NavLink } from 'react-router-dom'
// // import { Waveform, BookOpen, Clock, Wrench } from '../shared/Icons.jsx'

// // const NAV = [
// //   { to: '/compose',   label: 'Compose',   Icon: Waveform },
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
// import { Waveform, BookOpen, Clock, Wrench, Scissors } from '../shared/Icons.jsx'

// const NAV = [
//   { to: '/compose',   label: 'Compose',   Icon: Waveform },
//   { to: '/alter',     label: 'Alter',     Icon: Scissors },
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
import { Waveform, BookOpen, Clock, Wrench } from '../shared/Icons.jsx'

const NAV = [
  { to: '/compose',   label: 'Compose',   Icon: Waveform },
  { to: '/knowledge', label: 'Knowledge', Icon: BookOpen },
  { to: '/history',   label: 'History',   Icon: Clock    },
  { to: '/tools',     label: 'Tools',     Icon: Wrench   },
]

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 1, color: 'var(--accent)', lineHeight: 1 }}>MIDI</div>
        <div style={{ fontFamily: 'var(--display)', fontSize: 26, letterSpacing: 1, color: 'var(--text)', lineHeight: 1 }}>GENERATOR</div>
        <div style={{ fontSize: 9, color: 'var(--text3)', letterSpacing: 3, textTransform: 'uppercase', fontFamily: 'var(--mono)', marginTop: 6 }}>AI Studio v2</div>
      </div>

      <nav style={{ padding: '12px 10px', flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 'var(--r-sm)',
                cursor: 'pointer', transition: 'all 0.15s ease',
                color: isActive ? 'var(--accent)' : 'var(--text3)',
                fontSize: 13, fontWeight: isActive ? 600 : 400,
                background: isActive ? 'rgba(232,255,71,0.07)' : 'transparent',
                borderLeft: `2px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
              }}>
                <Icon size={15} />
                <span>{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--success)', boxShadow: '0 0 8px var(--success)', animation: 'pulse 2.5s ease-in-out infinite' }} />
          connected
        </div>
      </div>
    </aside>
  )
}