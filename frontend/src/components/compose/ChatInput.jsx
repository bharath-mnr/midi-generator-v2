//E:\pro\midigenerator_v2\frontend\src\components\compose\ChatInput.jsx

import { useRef } from 'react'
import { Send } from '../shared/Icons.jsx'

export default function ChatInput({ value, onChange, onSend, disabled }) {
  const ref = useRef(null)

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  return (
    <div style={{
      borderTop: '1px solid var(--border)',
      padding: '16px 24px 20px',
      background: 'var(--surface)',
      flexShrink: 0,
    }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          ref={ref}
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          placeholder="Describe your composition… dark cinematic, Dm, 85 BPM, 8 bars"
          rows={1}
          style={{
            flex: 1,
            background: 'var(--surface2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '12px 16px',
            color: 'var(--text)',
            fontFamily: 'var(--font)',
            fontSize: 14,
            resize: 'none',
            outline: 'none',
            transition: 'border-color 0.2s ease',
            lineHeight: 1.5,
            minHeight: 48,
            maxHeight: 120,
          }}
          onFocus={e => e.target.style.borderColor = 'var(--border2)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={onSend}
          disabled={disabled || !value.trim()}
          style={{
            width: 44, height: 44,
            borderRadius: 'var(--radius-sm)',
            background: !value.trim() || disabled ? 'var(--surface3)' : 'var(--accent)',
            border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: !value.trim() || disabled ? 'var(--text3)' : '#000',
            cursor: !value.trim() || disabled ? 'not-allowed' : 'pointer',
            transition: 'all 0.15s ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => { if (!disabled && value.trim()) { e.currentTarget.style.background = '#d4f570'; e.currentTarget.style.transform = 'translateY(-1px)' } }}
          onMouseLeave={e => { e.currentTarget.style.background = !value.trim() || disabled ? 'var(--surface3)' : 'var(--accent)'; e.currentTarget.style.transform = 'none' }}
        >
          <Send size={16} />
        </button>
      </div>
      <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
        Enter to send · Shift+Enter for newline
      </div>
    </div>
  )
}
