// //E:\pro\midigenerator_v2\frontend\src\components\shared\ErrorDisplay.jsx

import { AlertTri } from './Icons.jsx'

export default function ErrorDisplay({ errors }) {
  if (!errors || errors.length === 0) return null
  return (
    <div style={{
      background: 'rgba(245,85,74,0.07)',
      border: '1px solid rgba(245,85,74,0.25)',
      borderRadius: 8, padding: '10px 14px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        fontSize: 12, color: 'var(--rose)', fontWeight: 600,
        marginBottom: errors.length > 1 ? 6 : 0, fontFamily: 'var(--mono)',
      }}>
        <AlertTri size={13} stroke="var(--rose)" />
        {errors.length === 1 ? errors[0] : `${errors.length} errors`}
      </div>
      {errors.length > 1 && (
        <ul style={{ paddingLeft: 18, margin: 0 }}>
          {errors.map((e, i) => (
            <li key={i} style={{ fontSize: 11, color: 'var(--rose)', fontFamily: 'var(--mono)', marginTop: 3 }}>{e}</li>
          ))}
        </ul>
      )}
    </div>
  )
}