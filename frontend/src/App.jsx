// // //E:\pro\midigenerator_v2\frontend\src\App.jsx

// import { Routes, Route, Navigate, NavLink } from 'react-router-dom'
// import Sidebar       from './components/layout/Sidebar.jsx'
// import TopBar        from './components/layout/TopBar.jsx'
// import Compose       from './pages/Compose.jsx'
// import KnowledgeBase from './pages/KnowledgeBase.jsx'
// import History       from './pages/History.jsx'
// import Tools         from './pages/Tools.jsx'

// const MNAV = [
//   { to: '/compose',   label: 'Compose',   d: 'M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z' },
//   { to: '/knowledge', label: 'Knowledge', d: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15z' },
//   { to: '/history',   label: 'History',   d: 'M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
//   { to: '/tools',     label: 'Tools',     d: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
// ]

// const MIcon = ({ d }) => (
//   <svg width={18} height={18} viewBox="0 0 24 24" fill="none"
//     stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
//     <path d={d} />
//   </svg>
// )

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
//         {MNAV.map(({ to, label, d }) => (
//           <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'active' : ''}>
//             <MIcon d={d} />
//             {label}
//           </NavLink>
//         ))}
//       </nav>
//     </div>
//   )
// }





// ═══════════════════════════════════════════════════════════════════
// APP.JSX — Main tool router  v1.1
//
// Tab 1: JSON → MIDI    → components/tools/JsonToMidi.jsx
// Tab 2: MIDI → JSON    → components/tools/MidiToJson.jsx
// Tab 3: Music Analyzer → pages/AnalyzerPage.jsx
//
// FIX v1.1:
//   [7] Import paths corrected to match actual project folder structure.
//       Original had './JsonToMidi' which resolves to src/JsonToMidi.jsx
//       (doesn't exist). Correct paths are relative to src/App.jsx.
// ═══════════════════════════════════════════════════════════════════

import React, { useState } from 'react';
import { Music, Download, Upload, BarChart2 } from 'lucide-react';

// ── FIX [7]: corrected import paths ──────────────────────────────
import JsonToMidi    from './components/tools/JsonToMidi';
import MidiToJson    from './components/tools/MidiToJson';
import AnalyzerPage  from './pages/AnalyzerPage';

// ─── TAB CONFIG ──────────────────────────────────────────────────
const TABS = [
  {
    id:    'json2midi',
    label: 'JSON → MIDI',
    icon:  Download,
    grad:  'linear-gradient(135deg,#06b6d4,#8b5cf6)',
    desc:  'Convert compact JSON to downloadable .mid file'
  },
  {
    id:    'midi2json',
    label: 'MIDI → JSON',
    icon:  Upload,
    grad:  'linear-gradient(135deg,#f97316,#a855f7)',
    desc:  'Upload a .mid file, get compact JSON'
  },
  {
    id:    'analyze',
    label: 'Analyzer',
    icon:  BarChart2,
    grad:  'linear-gradient(135deg,#10b981,#06b6d4)',
    desc:  'Pattern detection · Graph · YAML blueprint'
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('json2midi');
  const active = TABS.find(t => t.id === activeTab);

  return (
    <div className="min-h-screen" style={{ background:'linear-gradient(135deg,#0f172a,#1e293b,#0f172a)' }}>

      {/* ── Global Nav ────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50"
           style={{ background:'rgba(15,23,42,0.85)', backdropFilter:'blur(20px)', borderBottom:'1px solid rgba(71,85,105,0.4)' }}>
        <div className="flex items-center gap-3 px-4 py-2 mx-auto max-w-screen-2xl">

          {/* Logo */}
          <div className="flex items-center gap-2 mr-4 shrink-0">
            <div className="flex items-center justify-center rounded-lg w-7 h-7"
                 style={{ background:'linear-gradient(135deg,#06b6d4,#8b5cf6)' }}>
              <Music className="w-4 h-4 text-white" />
            </div>
            <span className="hidden text-sm font-bold tracking-tight text-white sm:block">MidiGen V2</span>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5">
            {TABS.map(tab => {
              const Icon     = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={tab.desc}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={isActive
                    ? { background: tab.grad, color: 'white', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }
                    : { color:'#94a3b8', background:'transparent' }}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </nav>

      {/* ── Page Content ────────────────────────────────────────── */}
      <main>
        {activeTab === 'json2midi' && <JsonToMidi />}
        {activeTab === 'midi2json' && <MidiToJson />}
        {activeTab === 'analyze'   && <AnalyzerPage />}
      </main>
    </div>
  );
}