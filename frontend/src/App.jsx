// // // //E:\pro\midigenerator_v2\frontend\src\App.jsx


// // // import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
// // // import Sidebar   from './components/layout/Sidebar.jsx'
// // // import TopBar    from './components/layout/TopBar.jsx'
// // // import Compose      from './pages/Compose.jsx'
// // // import KnowledgeBase from './pages/KnowledgeBase.jsx'
// // // import History      from './pages/History.jsx'
// // // import Tools        from './pages/Tools.jsx'
// // // import { Waveform, BookOpen, Clock, Wrench } from './components/shared/Icons.jsx'

// // // const NAV = [
// // //   { to: '/compose',   label: 'Compose',   Icon: Waveform  },
// // //   { to: '/knowledge', label: 'Knowledge', Icon: BookOpen  },
// // //   { to: '/history',   label: 'History',   Icon: Clock     },
// // //   { to: '/tools',     label: 'Tools',     Icon: Wrench    },
// // // ]

// // // export default function App() {
// // //   return (
// // //     <div className="app-shell">
// // //       {/* Desktop sidebar */}
// // //       <Sidebar />

// // //       <div className="app-main">
// // //         <TopBar />
// // //         <main style={{ flex: 1, overflow: 'hidden' }}>
// // //           <Routes>
// // //             <Route path="/"          element={<Navigate to="/compose" replace />} />
// // //             <Route path="/compose"   element={<Compose />} />
// // //             <Route path="/knowledge" element={<KnowledgeBase />} />
// // //             <Route path="/history"   element={<History />} />
// // //             <Route path="/tools"     element={<Tools />} />
// // //           </Routes>
// // //         </main>
// // //       </div>

// // //       {/* Mobile bottom nav */}
// // //       <nav className="bottom-nav">
// // //         {NAV.map(({ to, label, Icon }) => (
// // //           <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
// // //             <Icon size={20} />
// // //             {label}
// // //           </NavLink>
// // //         ))}
// // //       </nav>
// // //     </div>
// // //   )
// // // }









// // import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
// // import Sidebar       from './components/layout/Sidebar.jsx'
// // import TopBar        from './components/layout/TopBar.jsx'
// // import Compose       from './pages/Compose.jsx'
// // import KnowledgeBase from './pages/KnowledgeBase.jsx'
// // import History       from './pages/History.jsx'
// // import Tools         from './pages/Tools.jsx'
// // import Alter         from './pages/Alter.jsx'
// // import { Waveform, BookOpen, Clock, Wrench, Scissors } from './components/shared/Icons.jsx'

// // const NAV = [
// //   { to: '/compose',   label: 'Compose',   Icon: Waveform  },
// //   { to: '/alter',     label: 'Alter',     Icon: Scissors  },
// //   { to: '/knowledge', label: 'Knowledge', Icon: BookOpen  },
// //   { to: '/history',   label: 'History',   Icon: Clock     },
// //   { to: '/tools',     label: 'Tools',     Icon: Wrench    },
// // ]

// // export default function App() {
// //   return (
// //     <div className="app-shell">
// //       <Sidebar />
// //       <div className="app-main">
// //         <TopBar />
// //         <main style={{ flex: 1, overflow: 'hidden' }}>
// //           <Routes>
// //             <Route path="/"          element={<Navigate to="/compose" replace />} />
// //             <Route path="/compose"   element={<Compose />} />
// //             <Route path="/alter"     element={<Alter />} />
// //             <Route path="/knowledge" element={<KnowledgeBase />} />
// //             <Route path="/history"   element={<History />} />
// //             <Route path="/tools"     element={<Tools />} />
// //           </Routes>
// //         </main>
// //       </div>
// //       <nav className="bottom-nav">
// //         {NAV.map(({ to, label, Icon }) => (
// //           <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
// //             <Icon size={18} />
// //             {label}
// //           </NavLink>
// //         ))}
// //       </nav>
// //     </div>
// //   )
// // }









// import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
// import Sidebar       from './components/layout/Sidebar.jsx'
// import TopBar        from './components/layout/TopBar.jsx'
// import Compose       from './pages/Compose.jsx'
// import KnowledgeBase from './pages/KnowledgeBase.jsx'
// import History       from './pages/History.jsx'
// import Tools         from './pages/Tools.jsx'
// import { Waveform, BookOpen, Clock, Wrench } from './components/shared/Icons.jsx'

// const NAV = [
//   { to: '/compose',   label: 'Compose',   Icon: Waveform },
//   { to: '/knowledge', label: 'Knowledge', Icon: BookOpen },
//   { to: '/history',   label: 'History',   Icon: Clock    },
//   { to: '/tools',     label: 'Tools',     Icon: Wrench   },
// ]

// export default function App() {
//   return (
//     <div className="app-shell">
//       <Sidebar />
//       <div className="app-main">
//         <TopBar />
//         <main style={{ flex: 1, overflow: 'hidden' }}>
//           <Routes>
//             <Route path="/"          element={<Navigate to="/compose" replace />} />
//             <Route path="/compose"   element={<Compose />} />
//             <Route path="/knowledge" element={<KnowledgeBase />} />
//             <Route path="/history"   element={<History />} />
//             <Route path="/tools"     element={<Tools />} />
//           </Routes>
//         </main>
//       </div>
//       <nav className="bottom-nav">
//         {NAV.map(({ to, label, Icon }) => (
//           <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
//             <Icon size={18} />
//             {label}
//           </NavLink>
//         ))}
//       </nav>
//     </div>
//   )
// }







import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
import Sidebar       from './components/layout/Sidebar.jsx'
import TopBar        from './components/layout/TopBar.jsx'
import Compose       from './pages/Compose.jsx'
import KnowledgeBase from './pages/KnowledgeBase.jsx'
import History       from './pages/History.jsx'
import Tools         from './pages/Tools.jsx'

const MNAV = [
  { to: '/compose',   label: 'Compose',   d: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
  { to: '/knowledge', label: 'Knowledge', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z' },
  { to: '/history',   label: 'History',   d: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { to: '/tools',     label: 'Tools',     d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
]

const MIcon = ({ d }) => (
  <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main style={{ flex: 1, overflow: 'hidden' }}>
          <Routes>
            <Route path="/"          element={<Navigate to="/compose" replace />} />
            <Route path="/compose"   element={<Compose />} />
            <Route path="/knowledge" element={<KnowledgeBase />} />
            <Route path="/history"   element={<History />} />
            <Route path="/tools"     element={<Tools />} />
          </Routes>
        </main>
      </div>
      <nav className="bottom-nav">
        {MNAV.map(({ to, label, d }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
            <MIcon d={d} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}