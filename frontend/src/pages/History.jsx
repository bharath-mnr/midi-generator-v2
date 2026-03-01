//E:\pro\midigenerator_v2\frontend\src\pages\History.jsx

import { useHistory } from '../hooks/useHistory.js'
import { Download, Music } from '../components/shared/Icons.jsx'

function Bars() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 18 }}>
      {[5, 10, 7, 14, 9, 12, 6].map((h, i) => (
        <div key={i} style={{
          width: 3, height: h, borderRadius: 2,
          background: 'var(--accent)', opacity: 0.6,
          animation: `wave ${0.9 + i * 0.12}s ease-in-out ${i * 0.08}s infinite`,
        }} />
      ))}
    </div>
  )
}

export default function History() {
  const { items, loading, redownload } = useHistory()

  if (loading) return (
    <div style={{ padding: 24, fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
      Loading…
    </div>
  )

  if (items.length === 0) return (
    <div style={{ padding: 24, textAlign: 'center', color: 'var(--text3)', marginTop: 80 }}>
      <div style={{ fontFamily: 'var(--display)', fontSize: 36, color: 'var(--text)', marginBottom: 8 }}>NO HISTORY</div>
      <div style={{ fontSize: 13 }}>Go to Compose and generate your first MIDI.</div>
    </div>
  )

  return (
    <div className="page-pad" style={{ height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-lg)',
            padding: 18, cursor: 'default',
            transition: 'all 0.2s ease',
            animation: 'fadeUp 0.3s ease forwards',
            animationDelay: `${i * 0.04}s`, opacity: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(232,255,71,0.06)',
                border: '1px solid rgba(232,255,71,0.1)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--accent)',
              }}>
                <Bars />
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
                {item.date || item.created_at}
              </div>
            </div>

            <div style={{
              fontSize: 13, fontWeight: 500, color: 'var(--text)',
              lineHeight: 1.5, marginBottom: 12,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.prompt}
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
              {item.key && (
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 4, color: 'var(--accent)', background: 'rgba(232,255,71,0.05)', border: '1px solid rgba(232,255,71,0.15)' }}>
                  {item.key}
                </span>
              )}
              {item.tempo && (
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 4, color: 'var(--accent2)', background: 'rgba(71,255,224,0.05)', border: '1px solid rgba(71,255,224,0.15)' }}>
                  {item.tempo} BPM
                </span>
              )}
              {item.bars && (
                <span style={{ fontSize: 10, fontFamily: 'var(--mono)', padding: '2px 8px', borderRadius: 4, color: 'var(--text2)', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                  {item.bars} bars
                </span>
              )}
            </div>

            <button onClick={() => redownload(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 'var(--r-sm)',
              background: 'var(--surface2)', border: '1px solid var(--border)',
              color: 'var(--text2)', fontSize: 12, fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'rgba(232,255,71,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)';  e.currentTarget.style.color = 'var(--text2)';  e.currentTarget.style.background = 'var(--surface2)' }}
            >
              <Download size={12} /> Re-download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}