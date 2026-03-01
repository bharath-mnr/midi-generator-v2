//E:\pro\midigenerator_v2\frontend\src\components\knowledge\MidiUploadZone.jsx

import { useRef, useState } from 'react'
import { Music } from '../shared/Icons.jsx'
import { ingestMidi } from '../../services/api.js'

export default function MidiUploadZone({ onUploaded }) {
  const [drag, setDrag] = useState(false)
  const [uploading, setUploading] = useState(false)
  const ref = useRef(null)

  const handleFile = async (file) => {
    if (!file || !file.name.match(/\.(mid|midi)$/i)) return
    setUploading(true)
    try {
      const result = await ingestMidi(file)
      onUploaded?.(result)
    } catch (err) {
      console.error(err)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true) }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
      style={{
        border: `1.5px dashed ${drag ? 'var(--accent)' : 'var(--border2)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: '36px 24px',
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        background: drag ? 'rgba(200,240,96,0.03)' : 'var(--surface)',
      }}
    >
      <input ref={ref} type="file" accept=".mid,.midi" style={{ display: 'none' }}
        onChange={e => handleFile(e.target.files[0])} />

      <div style={{
        width: 52, height: 52,
        borderRadius: 16,
        background: drag ? 'rgba(200,240,96,0.08)' : 'var(--surface2)',
        border: `1px solid ${drag ? 'var(--accent)' : 'var(--border)'}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 16px',
        color: drag ? 'var(--accent)' : 'var(--text2)',
        transition: 'all 0.2s ease',
      }}>
        <Music size={22} />
      </div>

      <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
        {uploading ? 'Indexing...' : 'Upload MIDI Files'}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text3)', lineHeight: 1.6 }}>
        Drop .mid files here. They'll be analyzed and indexed into your knowledge base.
      </div>
      <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginTop: 12 }}>
        {['.mid', '.midi'].map(f => (
          <span key={f} style={{
            fontSize: 10, fontFamily: 'var(--mono)',
            padding: '2px 8px', borderRadius: 4,
            background: 'var(--surface3)', color: 'var(--text3)',
            border: '1px solid var(--border)',
          }}>{f}</span>
        ))}
      </div>
    </div>
  )
}
