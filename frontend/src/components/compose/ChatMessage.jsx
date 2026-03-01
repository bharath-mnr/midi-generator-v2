
//E:\pro\midigenerator_v2\frontend\src\components\compose\ChatMessage.jsx
import MidiDownloadCard from './MidiDownloadCard.jsx'

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'

  const handleDownload = () => {
    if (!message.midi?.url) return
    const a = document.createElement('a')
    a.href = message.midi.url
    a.download = message.midi.name || 'composition.mid'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 12,
      animation: 'fadeUp 0.3s ease forwards',
    }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32,
        borderRadius: 10,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700,
        flexShrink: 0, marginTop: 2,
        background: isUser ? 'var(--surface3)' : 'rgba(200,240,96,0.1)',
        color: isUser ? 'var(--text2)' : 'var(--accent)',
        border: isUser
          ? '1px solid var(--border2)'
          : '1px solid rgba(200,240,96,0.2)',
        fontFamily: 'var(--mono)',
      }}>
        {isUser ? 'U' : 'M'}
      </div>

      {/* Content */}
      <div style={{ maxWidth: 560 }}>
        <div style={{
          padding: '12px 16px',
          borderRadius: 14,
          fontSize: 14, lineHeight: 1.7,
          background: isUser ? 'rgba(200,240,96,0.07)' : 'var(--surface2)',
          border: isUser
            ? '1px solid rgba(200,240,96,0.15)'
            : '1px solid var(--border)',
          color: 'var(--text)',
          borderTopRightRadius: isUser ? 4 : 14,
          borderTopLeftRadius:  isUser ? 14 : 4,
        }}>
          {message.text}
        </div>
        {message.midi && (
          <MidiDownloadCard
            name={message.midi.name}
            meta={message.midi.meta}
            onDownload={handleDownload}
          />
        )}
      </div>
    </div>
  )
}