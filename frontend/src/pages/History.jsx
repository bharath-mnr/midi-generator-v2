//E:\pro\midigenerator_v2\frontend\src\pages\History.jsx
import { useHistory } from '../hooks/useHistory.js'

const ic = (d, size = 14, sw = 1.5) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

function WaveViz() {
  const heights = [3, 7, 5, 10, 6, 9, 4]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 12 }}>
      {heights.map((h, i) => (
        <div key={i} style={{
          width: 2.5, height: h, borderRadius: 2,
          background: 'var(--a1)', opacity: 0.7,
          animation: `wave ${0.8 + i * 0.1}s ${i * 0.07}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

export default function History() {
  const { items, loading, redownload } = useHistory()

  if (loading) return (
    <div style={{ padding: 28, fontSize: 11, color: 'var(--t3)', fontFamily: 'var(--mono)' }}>Loading…</div>
  )

  if (items.length === 0) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, color: 'var(--t3)', animation: 'fadeIn 0.4s ease' }}>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 36, color: 'var(--t1)' }}>No history yet</div>
      <div style={{ fontSize: 12, fontFamily: 'var(--mono)' }}>Go compose something.</div>
    </div>
  )

  return (
    <div className="page">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 10 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{
            background: 'var(--s1)', border: '1px solid var(--b1)',
            borderRadius: 12, padding: 16,
            transition: 'all 0.15s ease',
            animation: 'fadeUp 0.3s ease forwards',
            animationDelay: `${i * 0.03}s`, opacity: 0,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--b2)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b1)'; e.currentTarget.style.transform = 'none' }}
          >
            {/* Top row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8,
                background: 'rgba(200,245,96,0.07)', border: '1px solid rgba(200,245,96,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <WaveViz />
              </div>
              <div style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--t3)' }}>
                {item.date || item.created_at}
              </div>
            </div>

            {/* Prompt */}
            <div style={{
              fontSize: 12, fontWeight: 400, color: 'var(--t1)', lineHeight: 1.55,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1,
            }}>
              {item.prompt}
            </div>

            {/* Tags */}
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {item.key   && <span className="tag tag-a1">{item.key}</span>}
              {item.tempo && <span className="tag tag-a2">{item.tempo} BPM</span>}
              {item.bars  && <span className="tag tag-b">{item.bars} bars</span>}
            </div>

            {/* Download */}
            <button onClick={() => redownload(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 8,
              background: 'none', border: '1px solid var(--b1)',
              color: 'var(--t2)', fontSize: 11, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(200,245,96,0.35)'; e.currentTarget.style.color = 'var(--a1)'; e.currentTarget.style.background = 'rgba(200,245,96,0.04)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--b1)'; e.currentTarget.style.color = 'var(--t2)'; e.currentTarget.style.background = 'none' }}
            >
              {ic('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3', 12)}
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}