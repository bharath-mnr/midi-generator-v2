// //E:\pro\midigenerator_v2\frontend\src\pages\History.jsx

import { useHistory } from '../hooks/useHistory.js'

const Ic = ({ d, size = 14, sw = 1.7 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

function WaveBars() {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2.5, height: 14 }}>
      {[3, 8, 5, 12, 7, 10, 4].map((h, i) => (
        <div key={i} style={{
          width: 2.5, height: h, borderRadius: 2, background: 'var(--lime)',
          animation: `wave ${0.8 + i * 0.1}s ${i * 0.08}s ease-in-out infinite`,
        }} />
      ))}
    </div>
  )
}

export default function History() {
  const { items, loading, redownload } = useHistory()

  if (loading) return (
    <div style={{ padding: 24, fontSize: 11, color: 'var(--tx-3)', fontFamily: 'var(--mono)' }}>Loading…</div>
  )

  if (items.length === 0) return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', height: '100%', gap: 12,
      animation: 'fadeIn 0.4s ease',
    }}>
      <div style={{ width: 48, height: 48, borderRadius: 14, background: 'var(--surface)', border: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tx-3)' }}>
        <Ic d="M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" size={20} sw={1.5} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--tx-1)' }}>No history yet</div>
      <div style={{ fontSize: 13, color: 'var(--tx-3)' }}>Go compose something.</div>
    </div>
  )

  return (
    <div className="page">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 10 }}>
        {items.map((item, i) => (
          <div key={item.id} style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, padding: 16,
            display: 'flex', flexDirection: 'column', gap: 10,
            transition: 'all 0.15s',
            animation: 'fadeUp 0.25s ease forwards',
            animationDelay: `${i * 0.04}s`, opacity: 0,
          }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--line-md)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.transform = 'none' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: 'rgba(184,245,74,0.08)',
                border: '1px solid rgba(184,245,74,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <WaveBars />
              </div>
              <span style={{ fontSize: 9, fontFamily: 'var(--mono)', color: 'var(--tx-3)' }}>
                {item.date || item.created_at}
              </span>
            </div>

            <div style={{
              fontSize: 12, color: 'var(--tx-1)', lineHeight: 1.6, flex: 1,
              display: '-webkit-box', WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.prompt}
            </div>

            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {item.key   && <span className="tag tag-lime">{item.key}</span>}
              {item.tempo && <span className="tag tag-sky">{item.tempo} BPM</span>}
              {item.bars  && <span className="tag tag-dim">{item.bars} bars</span>}
            </div>

            <button onClick={() => redownload(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 6,
              padding: '8px 0', borderRadius: 8,
              background: 'none', border: '1px solid var(--line)',
              color: 'var(--tx-2)', fontSize: 11, fontWeight: 500,
              cursor: 'pointer', transition: 'all 0.12s', fontFamily: 'var(--font)',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(184,245,74,0.4)'; e.currentTarget.style.color = 'var(--lime)'; e.currentTarget.style.background = 'rgba(184,245,74,0.05)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--line)'; e.currentTarget.style.color = 'var(--tx-2)'; e.currentTarget.style.background = 'none' }}
            >
              <Ic d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" size={12} />
              Download
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}