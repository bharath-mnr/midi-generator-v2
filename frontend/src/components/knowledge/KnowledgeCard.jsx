//E:\pro\midigenerator_v2\frontend\src\components\knowledge\KnowledgeCard.jsx

import { Music, FileText, Trash } from '../shared/Icons.jsx'

export default function KnowledgeCard({ item, onDelete, style }) {
  const isMidi = item.type === 'midi'

  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      padding: '14px 16px',
      display: 'flex', alignItems: 'center', gap: 12,
      transition: 'border-color 0.15s ease',
      animation: 'fadeUp 0.3s ease forwards',
      ...style,
    }}
      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border2)'}
      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
    >
      {/* Type icon */}
      <div style={{
        width: 36, height: 36, borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
        background: isMidi ? 'rgba(200,240,96,0.08)' : 'rgba(96,200,240,0.08)',
        color: isMidi ? 'var(--accent)' : 'var(--accent3)',
        border: `1px solid ${isMidi ? 'rgba(200,240,96,0.15)' : 'rgba(96,200,240,0.15)'}`,
      }}>
        {isMidi ? <Music size={16} /> : <FileText size={16} />}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 500, color: 'var(--text)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {item.name}
        </div>
        <div style={{
          fontSize: 11, color: 'var(--text3)',
          fontFamily: 'var(--mono)', marginTop: 2,
          display: 'flex', gap: 10,
        }}>
          {item.key   && <span>Key: {item.key}</span>}
          {item.tempo && <span>Tempo: {item.tempo}</span>}
          <span>{item.date}</span>
        </div>
      </div>

      {/* Chunks badge */}
      <div style={{
        fontSize: 11, fontFamily: 'var(--mono)',
        color: 'var(--text3)',
        background: 'var(--surface2)',
        padding: '2px 8px', borderRadius: 4,
        flexShrink: 0,
      }}>
        {item.chunks} chunks
      </div>

      {/* Delete */}
      <button
        onClick={() => onDelete?.(item.id)}
        style={{
          width: 30, height: 30, borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'none',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text3)', cursor: 'pointer',
          transition: 'all 0.15s ease', flexShrink: 0,
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--danger)'; e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(240,96,96,0.05)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text3)'; e.currentTarget.style.background = 'none' }}
      >
        <Trash size={13} />
      </button>
    </div>
  )
}
