// //E:\pro\midigenerator_v2\frontend\src\pages\KnowledgeBase.jsx

// import { useRef, useState } from 'react'
// import { useKnowledge } from '../hooks/useKnowledge.js'
// import { Music, FileText, Trash, Upload } from '../components/shared/Icons.jsx'
// import { ingestMidi, ingestDoc } from '../services/api.js'

// function UploadZone({ accept, label, icon: Icon, color, onFile, uploading }) {
//   const [dragging, setDragging] = useState(false)
//   const ref = useRef(null)

//   return (
//     <div
//       onClick={() => !uploading && ref.current?.click()}
//       onDragOver={e => { e.preventDefault(); setDragging(true) }}
//       onDragLeave={() => setDragging(false)}
//       onDrop={e => {
//         e.preventDefault(); setDragging(false)
//         const file = e.dataTransfer.files[0]
//         if (file) onFile(file)
//       }}
//       style={{
//         display: 'flex', flexDirection: 'column',
//         alignItems: 'center', justifyContent: 'center',
//         gap: 10, padding: '28px 20px',
//         border: `1.5px dashed ${dragging ? color : 'var(--border2)'}`,
//         borderRadius: 'var(--r-lg)',
//         cursor: uploading ? 'wait' : 'pointer',
//         background: 'var(--surface2)',
//         transition: 'all 0.2s ease',
//         userSelect: 'none',
//       }}
//       onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = color }}
//       onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)' }}
//     >
//       <input
//         ref={ref}
//         type="file"
//         accept={accept}
//         style={{ display: 'none' }}
//         onChange={e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = '' }}
//       />
//       <div style={{
//         width: 40, height: 40, borderRadius: 10,
//         background: 'rgba(232,255,71,0.06)', border: '1px solid rgba(232,255,71,0.15)',
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         color: uploading ? 'var(--text3)' : color,
//       }}>
//         {uploading
//           ? <div style={{ width: 16, height: 16, border: '2px solid var(--border2)', borderTopColor: color, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
//           : <Icon size={18} />}
//       </div>
//       <div style={{ textAlign: 'center' }}>
//         <div style={{ fontSize: 13, fontWeight: 600, color: uploading ? 'var(--text3)' : 'var(--text)' }}>
//           {uploading ? 'Uploading…' : label}
//         </div>
//         <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 3 }}>
//           {accept}
//         </div>
//       </div>
//     </div>
//   )
// }

// function KnowledgeRow({ item, onDelete, deleting }) {
//   const isMidi = item.type === 'midi'
//   return (
//     <div style={{
//       display: 'flex', alignItems: 'center', gap: 12,
//       padding: '12px 16px',
//       background: 'var(--surface2)', border: '1px solid var(--border)',
//       borderRadius: 'var(--r)', transition: 'border-color 0.15s ease',
//       animation: 'fadeUp 0.25s ease forwards',
//       opacity: deleting ? 0.4 : 1,
//     }}
//       onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
//       onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
//     >
//       <div style={{
//         width: 34, height: 34, borderRadius: 8, flexShrink: 0,
//         background: isMidi ? 'rgba(232,255,71,0.06)' : 'rgba(71,255,224,0.06)',
//         border: `1px solid ${isMidi ? 'rgba(232,255,71,0.12)' : 'rgba(71,255,224,0.12)'}`,
//         display: 'flex', alignItems: 'center', justifyContent: 'center',
//         color: isMidi ? 'var(--accent)' : 'var(--accent2)',
//       }}>
//         {isMidi ? <Music size={14} /> : <FileText size={14} />}
//       </div>

//       <div style={{ flex: 1, minWidth: 0 }}>
//         <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
//           {item.name}
//         </div>
//         <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 2, display: 'flex', gap: 10 }}>
//           {item.key   && <span>Key: {item.key}</span>}
//           {item.tempo && <span>{item.tempo} BPM</span>}
//           <span>{item.date}</span>
//         </div>
//       </div>

//       <div style={{
//         fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)',
//         background: 'var(--surface3)', padding: '2px 8px', borderRadius: 4, flexShrink: 0,
//       }}>
//         {item.chunks} chunks
//       </div>

//       <button
//         onClick={() => !deleting && onDelete(item.id)}
//         disabled={deleting}
//         style={{
//           width: 28, height: 28, borderRadius: 6, flexShrink: 0,
//           border: '1px solid var(--border)', background: 'none',
//           cursor: deleting ? 'wait' : 'pointer',
//           display: 'flex', alignItems: 'center', justifyContent: 'center',
//           color: 'var(--text3)', transition: 'all 0.15s ease',
//         }}
//         onMouseEnter={e => { if (!deleting) { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(255,79,79,0.06)' } }}
//         onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'none' }}
//       >
//         <Trash size={12} />
//       </button>
//     </div>
//   )
// }

// export default function KnowledgeBase() {
//   const { items, loading, error, addItem, removeItem } = useKnowledge()
//   const [uploadingMidi, setUploadingMidi] = useState(false)
//   const [uploadingDoc,  setUploadingDoc]  = useState(false)
//   const [deletingId,    setDeletingId]    = useState(null)
//   const [uploadError,   setUploadError]   = useState(null)

//   const handleMidi = async (file) => {
//     setUploadingMidi(true); setUploadError(null)
//     try { addItem(await ingestMidi(file)) }
//     catch (e) { setUploadError(e.message) }
//     finally { setUploadingMidi(false) }
//   }

//   const handleDoc = async (file) => {
//     setUploadingDoc(true); setUploadError(null)
//     try { addItem(await ingestDoc(file)) }
//     catch (e) { setUploadError(e.message) }
//     finally { setUploadingDoc(false) }
//   }

//   const handleDelete = async (id) => {
//     setDeletingId(id)
//     await removeItem(id)
//     setDeletingId(null)
//   }

//   return (
//     <div style={{ height: '100%', overflowY: 'auto', padding: 24 }}>

//       <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 24 }}>
//         <UploadZone accept=".mid,.midi"    label="Upload MIDI"     icon={Music}   color="var(--accent)"  onFile={handleMidi} uploading={uploadingMidi} />
//         <UploadZone accept=".pdf,.txt,.md" label="Upload Document" icon={Upload}  color="var(--accent2)" onFile={handleDoc}  uploading={uploadingDoc}  />
//       </div>

//       {uploadError && (
//         <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(255,79,79,0.06)', border: '1px solid rgba(255,79,79,0.18)', borderRadius: 'var(--r-sm)', padding: '8px 12px', marginBottom: 14 }}>
//           ⚠ {uploadError}
//         </div>
//       )}

//       <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 10 }}>
//         Indexed — {items.length} {items.length === 1 ? 'file' : 'files'}
//       </div>

//       {error && (
//         <div style={{ fontSize: 12, color: 'var(--danger)', background: 'rgba(255,79,79,0.06)', border: '1px solid rgba(255,79,79,0.18)', borderRadius: 'var(--r-sm)', padding: '8px 12px', marginBottom: 10 }}>
//           ⚠ {error}
//         </div>
//       )}

//       {loading ? (
//         <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', padding: '20px 0' }}>Loading…</div>
//       ) : items.length === 0 ? (
//         <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text3)', fontSize: 13 }}>
//           No files indexed yet. Upload a MIDI or document above.
//         </div>
//       ) : (
//         <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
//           {items.map(item => (
//             <KnowledgeRow
//               key={item.id}
//               item={item}
//               onDelete={handleDelete}
//               deleting={deletingId === item.id}
//             />
//           ))}
//         </div>
//       )}
//     </div>
//   )
// }












import { useRef, useState } from 'react'
import { useKnowledge } from '../hooks/useKnowledge.js'
import { ingestMidi, ingestDoc } from '../services/api.js'

const ic = (d, size = 14, sw = 1.5) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

function DropZone({ accept, label, hint, accentVar, onFile, uploading }) {
  const [over, setOver] = useState(false)
  const ref = useRef(null)
  const accent = `var(${accentVar})`
  const rgba   = accentVar === '--a1' ? 'rgba(200,245,96,' : 'rgba(96,213,245,'

  return (
    <div
      onClick={() => !uploading && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      style={{
        padding: '22px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        border: `1px dashed ${over ? accent : 'var(--b1)'}`,
        borderRadius: 12,
        background: over ? `${rgba}0.03)` : 'var(--s1)',
        cursor: uploading ? 'wait' : 'pointer',
        transition: 'all 0.15s', userSelect: 'none',
      }}
      onMouseEnter={e => { if (!uploading) e.currentTarget.style.borderColor = `${rgba}0.35)` }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = over ? accent : 'var(--b1)' }}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = '' }} />

      <div style={{
        width: 36, height: 36, borderRadius: 9,
        background: `${rgba}0.07)`, border: `1px solid ${rgba}0.18)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: uploading ? 'var(--t3)' : accent,
      }}>
        {uploading
          ? <div style={{ width: 14, height: 14, borderRadius: '50%', border: `1.5px solid transparent`, borderTopColor: accent, animation: 'spin 0.65s linear infinite' }} />
          : ic('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12', 16)
        }
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: uploading ? 'var(--t3)' : 'var(--t1)' }}>
          {uploading ? 'Uploading…' : label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'var(--mono)', marginTop: 3 }}>{hint}</div>
      </div>
    </div>
  )
}

function Row({ item, onDelete, deleting }) {
  const isMidi = item.type === 'midi'
  const rgba = isMidi ? 'rgba(200,245,96,' : 'rgba(96,213,245,'
  const accent = isMidi ? 'var(--a1)' : 'var(--a2)'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '10px 14px',
      background: 'var(--s1)', border: '1px solid var(--b1)',
      borderRadius: 10, transition: 'border-color 0.12s',
      opacity: deleting ? 0.4 : 1,
      animation: 'fadeUp 0.2s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--b2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--b1)'}
    >
      <div style={{
        width: 30, height: 30, borderRadius: 7, flexShrink: 0,
        background: `${rgba}0.07)`, border: `1px solid ${rgba}0.18)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent,
      }}>
        {isMidi
          ? ic('M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z')
          : ic('M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4zM14 2v6h6M16 13H8M16 17H8M10 9H8')
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--t1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {item.name}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
          {item.key   && <span className="tag tag-a1">{item.key}</span>}
          {item.tempo && <span className="tag tag-a2">{item.tempo} BPM</span>}
          <span className="tag tag-b">{item.date}</span>
        </div>
      </div>

      <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t3)', background: 'var(--s2)', border: '1px solid var(--b1)', padding: '2px 7px', borderRadius: 4, flexShrink: 0 }}>
        {item.chunks} chunks
      </div>

      <button onClick={() => !deleting && onDelete(item.id)} disabled={deleting} style={{
        width: 26, height: 26, borderRadius: 6, flexShrink: 0,
        border: '1px solid var(--b1)', background: 'none',
        cursor: deleting ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--t3)', transition: 'all 0.12s',
      }}
        onMouseEnter={e => { if (!deleting) { e.currentTarget.style.borderColor = 'rgba(245,96,96,0.4)'; e.currentTarget.style.color = 'var(--a3)'; e.currentTarget.style.background = 'rgba(245,96,96,0.06)' } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b1)'; e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.background = 'none' }}
      >
        {ic('M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6', 12)}
      </button>
    </div>
  )
}

export default function KnowledgeBase() {
  const { items, loading, error, addItem, removeItem } = useKnowledge()
  const [uploadingMidi, setUploadingMidi] = useState(false)
  const [uploadingDoc,  setUploadingDoc]  = useState(false)
  const [deletingId,    setDeletingId]    = useState(null)
  const [uploadErr,     setUploadErr]     = useState(null)

  const handleMidi = async f => {
    setUploadingMidi(true); setUploadErr(null)
    try { addItem(await ingestMidi(f)) } catch (e) { setUploadErr(e.message) }
    finally { setUploadingMidi(false) }
  }
  const handleDoc = async f => {
    setUploadingDoc(true); setUploadErr(null)
    try { addItem(await ingestDoc(f)) } catch (e) { setUploadErr(e.message) }
    finally { setUploadingDoc(false) }
  }
  const handleDel = async id => {
    setDeletingId(id); await removeItem(id); setDeletingId(null)
  }

  return (
    <div className="page">

      {/* Upload zones */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <DropZone accept=".mid,.midi"    label="Upload MIDI"     hint=".mid / .midi"          accentVar="--a1" onFile={handleMidi} uploading={uploadingMidi} />
        <DropZone accept=".pdf,.txt,.md" label="Upload Document" hint=".pdf / .txt / .md"     accentVar="--a2" onFile={handleDoc}  uploading={uploadingDoc}  />
      </div>

      {uploadErr && (
        <div style={{ fontSize: 11, color: 'var(--a3)', background: 'rgba(245,96,96,0.06)', border: '1px solid rgba(245,96,96,0.18)', borderRadius: 8, padding: '8px 12px', marginBottom: 14, fontFamily: 'var(--mono)' }}>
          ⚠ {uploadErr}
        </div>
      )}

      {/* List header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--t3)', letterSpacing: 1.5, textTransform: 'uppercase' }}>
          Indexed · {items.length} {items.length === 1 ? 'file' : 'files'}
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 11, color: 'var(--a3)', fontFamily: 'var(--mono)', marginBottom: 10 }}>⚠ {error}</div>
      )}

      {loading ? (
        <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)', padding: '20px 0' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
          No files indexed yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {items.map(item => (
            <Row key={item.id} item={item} onDelete={handleDel} deleting={deletingId === item.id} />
          ))}
        </div>
      )}
    </div>
  )
}