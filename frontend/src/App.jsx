// // //E:\pro\midigenerator_v2\frontend\src\App.jsx


// // import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
// // import Sidebar   from './components/layout/Sidebar.jsx'
// // import TopBar    from './components/layout/TopBar.jsx'
// // import Compose      from './pages/Compose.jsx'
// // import KnowledgeBase from './pages/KnowledgeBase.jsx'
// // import History      from './pages/History.jsx'
// // import Tools        from './pages/Tools.jsx'
// // import { Waveform, BookOpen, Clock, Wrench } from './components/shared/Icons.jsx'

// // const NAV = [
// //   { to: '/compose',   label: 'Compose',   Icon: Waveform  },
// //   { to: '/knowledge', label: 'Knowledge', Icon: BookOpen  },
// //   { to: '/history',   label: 'History',   Icon: Clock     },
// //   { to: '/tools',     label: 'Tools',     Icon: Wrench    },
// // ]

// // export default function App() {
// //   return (
// //     <div className="app-shell">
// //       {/* Desktop sidebar */}
// //       <Sidebar />

// //       <div className="app-main">
// //         <TopBar />
// //         <main style={{ flex: 1, overflow: 'hidden' }}>
// //           <Routes>
// //             <Route path="/"          element={<Navigate to="/compose" replace />} />
// //             <Route path="/compose"   element={<Compose />} />
// //             <Route path="/knowledge" element={<KnowledgeBase />} />
// //             <Route path="/history"   element={<History />} />
// //             <Route path="/tools"     element={<Tools />} />
// //           </Routes>
// //         </main>
// //       </div>

// //       {/* Mobile bottom nav */}
// //       <nav className="bottom-nav">
// //         {NAV.map(({ to, label, Icon }) => (
// //           <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
// //             <Icon size={20} />
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
// import Alter         from './pages/Alter.jsx'
// import { Waveform, BookOpen, Clock, Wrench, Scissors } from './components/shared/Icons.jsx'

// const NAV = [
//   { to: '/compose',   label: 'Compose',   Icon: Waveform  },
//   { to: '/alter',     label: 'Alter',     Icon: Scissors  },
//   { to: '/knowledge', label: 'Knowledge', Icon: BookOpen  },
//   { to: '/history',   label: 'History',   Icon: Clock     },
//   { to: '/tools',     label: 'Tools',     Icon: Wrench    },
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
//             <Route path="/alter"     element={<Alter />} />
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
import { Waveform, BookOpen, Clock, Wrench } from './components/shared/Icons.jsx'

const NAV = [
  { to: '/compose',   label: 'Compose',   Icon: Waveform },
  { to: '/knowledge', label: 'Knowledge', Icon: BookOpen },
  { to: '/history',   label: 'History',   Icon: Clock    },
  { to: '/tools',     label: 'Tools',     Icon: Wrench   },
]

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
        {NAV.map(({ to, label, Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}