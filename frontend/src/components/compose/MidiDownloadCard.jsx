//E:\pro\midigenerator_v2\frontend\src\components\compose\MidiDownloadCard.jsx

import { Music, Download } from '../shared/Icons.jsx'

export default function MidiDownloadCard({ name, meta, onDownload }) {
  return (
    <div style={{
      background: 'var(--surface2)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: 16,
      marginTop: 8,
      display: 'flex',
      alignItems: 'center',
      gap: 14,
      transition: 'border-color 0.2s ease',
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44,
        borderRadius: 12,
        background: 'rgba(200,240,96,0.08)',
        border: '1px solid rgba(200,240,96,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--accent)', flexShrink: 0,
      }}>
        <Music size={20} />
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {name}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text3)',
          fontFamily: 'var(--mono)', marginTop: 2,
          display: 'flex', gap: 10,
        }}>
          <span>♩ {meta.tempo} BPM</span>
          <span>⬡ {meta.key}</span>
          <span>▤ {meta.bars} bars</span>
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={onDownload}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 14px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--accent)', color: '#000',
          fontSize: 12, fontWeight: 700,
          cursor: 'pointer', border: 'none',
          transition: 'all 0.15s ease',
          fontFamily: 'var(--font)',
          whiteSpace: 'nowrap', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.background = '#d4f570'; e.currentTarget.style.transform = 'translateY(-1px)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'var(--accent)'; e.currentTarget.style.transform = 'none' }}
      >
        <Download size={13} />
        Download
      </button>
    </div>
  )
}
