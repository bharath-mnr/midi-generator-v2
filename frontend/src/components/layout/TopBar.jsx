// // //E:\pro\midigenerator_v2\frontend\src\components\layout\TopBar.jsx


// import { useLocation } from 'react-router-dom'

// const META = {
//   '/knowledge': { title: 'Knowledge Base', sub: 'Upload and manage RAG context' },
//   '/history':   { title: 'History',        sub: 'Past compositions' },
//   '/tools':     { title: 'Tools',          sub: 'MIDI converters' },
// }

// export default function TopBar() {
//   const { pathname } = useLocation()
//   const info = META[pathname]
//   if (!info) return null

//   return (
//     <div style={{
//       height: 52,
//       borderBottom: '1px solid var(--border)',
//       display: 'flex', alignItems: 'center',
//       padding: '0 24px', gap: 12,
//       background: 'var(--surface)',
//       flexShrink: 0,
//     }}>
//       <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{info.title}</div>
//       <div style={{ width: 1, height: 14, background: 'var(--border2)' }} />
//       <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{info.sub}</div>
//     </div>
//   )
// }












import { useLocation } from 'react-router-dom'

const META = {
  '/alter':     { title: 'Alter MIDI',     sub: 'Upload a MIDI and add new layers with AI' },
  '/knowledge': { title: 'Knowledge Base', sub: 'Upload and manage RAG context' },
  '/history':   { title: 'History',        sub: 'Past compositions' },
  '/tools':     { title: 'Tools',          sub: 'MIDI converters' },
}

export default function TopBar() {
  const { pathname } = useLocation()
  const info = META[pathname]
  if (!info) return null

  return (
    <div style={{
      height: 52,
      borderBottom: '1px solid var(--border)',
      display: 'flex', alignItems: 'center',
      padding: '0 24px', gap: 12,
      background: 'var(--surface)',
      flexShrink: 0,
    }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{info.title}</div>
      <div style={{ width: 1, height: 14, background: 'var(--border2)' }} />
      <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{info.sub}</div>
    </div>
  )
}