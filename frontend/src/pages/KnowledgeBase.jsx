// //E:\pro\midigenerator_v2\frontend\src\pages\KnowledgeBase.jsx

import { useRef, useState } from 'react'
import { useKnowledge } from '../hooks/useKnowledge.js'
import { ingestMidi, ingestDoc } from '../services/api.js'

const Ic = ({ d, size = 15, sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

function DropZone({ accept, label, hint, color, glow, onFile, uploading }) {
  const [over, setOver] = useState(false)
  const ref = useRef(null)

  return (
    <div
      onClick={() => !uploading && ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={() => setOver(false)}
      onDrop={e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.files[0]; if (f) onFile(f) }}
      style={{
        padding: '20px 16px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        border: `1px dashed ${over ? color : 'var(--line-md)'}`,
        borderRadius: 12,
        background: over ? glow : 'var(--surface)',
        cursor: uploading ? 'wait' : 'pointer',
        transition: 'all 0.15s', userSelect: 'none',
      }}
      onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = color; e.currentTarget.style.background = glow } }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line-md)'; e.currentTarget.style.background = 'var(--surface)' }}
    >
      <input ref={ref} type="file" accept={accept} style={{ display: 'none' }}
        onChange={e => { const f = e.target.files[0]; if (f) onFile(f); e.target.value = '' }} />
      <div style={{
        width: 38, height: 38, borderRadius: 10,
        background: glow, border: `1px solid ${color}44`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: uploading ? 'var(--tx-3)' : color,
      }}>
        {uploading
          ? <div style={{ width: 15, height: 15, borderRadius: '50%', border: `2px solid transparent`, borderTopColor: color, animation: 'spin 0.65s linear infinite' }} />
          : <Ic d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" size={17} />
        }
      </div>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: uploading ? 'var(--tx-3)' : 'var(--tx-1)', marginBottom: 3 }}>
          {uploading ? 'Uploading…' : label}
        </div>
        <div style={{ fontSize: 10, color: 'var(--tx-3)', fontFamily: 'var(--mono)' }}>{hint}</div>
      </div>
    </div>
  )
}

function Row({ item, onDelete, deleting }) {
  const isMidi = item.type === 'midi'
  const color = isMidi ? 'var(--lime)' : 'var(--sky)'
  const glow  = isMidi ? 'rgba(184,245,74,0.08)' : 'rgba(74,184,245,0.08)'
  const border = isMidi ? 'rgba(184,245,74,0.22)' : 'rgba(74,184,245,0.22)'

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '11px 14px',
      background: 'var(--surface)', border: '1px solid var(--line)',
      borderRadius: 10, transition: 'border-color 0.12s',
      opacity: deleting ? 0.4 : 1, animation: 'fadeUp 0.2s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--line-md)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--line)'}
    >
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: glow, border: `1px solid ${border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', color,
      }}>
        {isMidi
          ? <Ic d="M9 18V5l12-2v13M9 18a3 3 0 1 1-6 0 3 3 0 0 1 6 0zm12 0a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" size={14} />
          : <Ic d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-4-4zM14 2v6h6M16 13H8M16 17H8M10 9H8" size={14} />
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--tx-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 3 }}>
          {item.name}
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {item.key   && <span className="tag tag-lime">{item.key}</span>}
          {item.tempo && <span className="tag tag-sky">{item.tempo} BPM</span>}
          <span className="tag tag-dim">{item.date}</span>
        </div>
      </div>

      <span style={{
        fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--tx-3)',
        background: 'var(--card)', border: '1px solid var(--line)',
        padding: '2px 7px', borderRadius: 4, flexShrink: 0,
      }}>
        {item.chunks} chunks
      </span>

      <button onClick={() => !deleting && onDelete(item.id)} disabled={deleting} style={{
        width: 28, height: 28, borderRadius: 7, flexShrink: 0,
        border: '1px solid var(--line)', background: 'none',
        cursor: deleting ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--tx-3)', transition: 'all 0.12s',
      }}
        onMouseEnter={e => { if (!deleting) { e.currentTarget.style.borderColor = 'rgba(245,85,74,0.45)'; e.currentTarget.style.color = 'var(--rose)'; e.currentTarget.style.background = 'var(--rose-glow)' } }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--tx-3)'; e.currentTarget.style.background = 'none' }}
      >
        <Ic d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" size={13} />
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
      {/* Drop zones */}
      <div className="grid-2" style={{ marginBottom: 20 }}>
        <DropZone
          accept=".mid,.midi" label="Upload MIDI" hint=".mid · .midi"
          color="var(--lime)" glow="rgba(184,245,74,0.06)"
          onFile={handleMidi} uploading={uploadingMidi}
        />
        <DropZone
          accept=".pdf,.txt,.md" label="Upload Document" hint=".pdf · .txt · .md"
          color="var(--sky)" glow="rgba(74,184,245,0.06)"
          onFile={handleDoc} uploading={uploadingDoc}
        />
      </div>

      {uploadErr && (
        <div style={{
          fontSize: 12, color: 'var(--rose)',
          background: 'var(--rose-glow)', border: '1px solid rgba(245,85,74,0.25)',
          borderRadius: 8, padding: '9px 13px', marginBottom: 16,
          fontFamily: 'var(--mono)',
        }}>⚠ {uploadErr}</div>
      )}

      <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--tx-3)', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 12 }}>
        Indexed · {items.length} {items.length === 1 ? 'file' : 'files'}
      </div>

      {error && (
        <div style={{ fontSize: 12, color: 'var(--rose)', fontFamily: 'var(--mono)', marginBottom: 10 }}>⚠ {error}</div>
      )}

      {loading ? (
        <div style={{ fontSize: 11, color: 'var(--tx-3)', fontFamily: 'var(--mono)', padding: '20px 0' }}>Loading…</div>
      ) : items.length === 0 ? (
        <div style={{ padding: '48px 0', textAlign: 'center', color: 'var(--tx-3)', fontSize: 13 }}>
          No files indexed yet. Upload a MIDI or document above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {items.map(item => (
            <Row key={item.id} item={item} onDelete={handleDel} deleting={deletingId === item.id} />
          ))}
        </div>
      )}
    </div>
  )
}