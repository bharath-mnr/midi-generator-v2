//frontend/src/pages/Alter.jsx

import { useRef, useState } from 'react'
import { alterMidi } from '../services/api.js'
import { Music, Upload, Download, Send } from '../components/shared/Icons.jsx'

const SUGGESTIONS = [
  'Add warm chord harmony in the mid-range that follows the melody',
  'Add a walking bass line in the low register',
  'Add lush string pads that sustain behind the melody',
  'Add a countermelody in the right hand that weaves between the notes',
  'Add rhythmic left-hand accompaniment like a nocturne',
  'Add tension-building chromatic inner voices',
]

export default function Alter() {
  const fileRef             = useRef(null)
  const [file,    setFile]  = useState(null)
  const [prompt,  setPrompt]= useState('')
  const [loading, setLoading]= useState(false)
  const [result,  setResult]= useState(null)
  const [error,   setError] = useState(null)
  const [dragging,setDrag]  = useState(false)

  const API_BASE = import.meta.env.VITE_API_URL || ''

  const handleFile = (f) => {
    if (!f || !f.name.match(/\.(mid|midi)$/i)) {
      setError('Please upload a .mid or .midi file')
      return
    }
    setFile(f)
    setResult(null)
    setError(null)
  }

  const handleSubmit = async () => {
    if (!file || !prompt.trim() || loading) return
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const data = await alterMidi(file, prompt.trim())
      setResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDownload = () => {
    if (!result?.midiUrl) return
    const url = result.midiUrl.startsWith('http') ? result.midiUrl : `${API_BASE}${result.midiUrl}`
    const a = document.createElement('a')
    a.href = url
    a.download = result.filename || 'altered.mid'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const canSubmit = file && prompt.trim() && !loading

  return (
    <div className="page-pad" style={{ height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontFamily: 'var(--display)', fontSize: 'clamp(24px,5vw,36px)', letterSpacing: 1, color: 'var(--text)', lineHeight: 1 }}>
          ALTER <span style={{ color: 'var(--accent)' }}>MIDI</span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 6 }}>
          Upload a MIDI → describe what to add → download the enhanced version
        </div>
      </div>

      {/* Step 1 — Upload */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 10 }}>
          Step 1 — Upload your MIDI
        </div>
        <div
          onClick={() => !loading && fileRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFile(e.dataTransfer.files[0]) }}
          style={{
            border: `1.5px dashed ${dragging ? 'var(--accent)' : file ? 'var(--accent2)' : 'var(--border2)'}`,
            borderRadius: 'var(--r-lg)',
            padding: '24px 20px',
            display: 'flex', alignItems: 'center', gap: 16,
            cursor: loading ? 'wait' : 'pointer',
            background: file ? 'rgba(71,255,224,0.03)' : 'var(--surface2)',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { if (!loading && !file) e.currentTarget.style.borderColor = 'var(--accent)' }}
          onMouseLeave={e => { if (!file) e.currentTarget.style.borderColor = 'var(--border2)' }}
        >
          <input ref={fileRef} type="file" accept=".mid,.midi" style={{ display: 'none' }}
            onChange={e => { handleFile(e.target.files[0]); e.target.value = '' }} />

          <div style={{
            width: 44, height: 44, borderRadius: 12, flexShrink: 0,
            background: file ? 'rgba(71,255,224,0.08)' : 'rgba(232,255,71,0.06)',
            border: `1px solid ${file ? 'rgba(71,255,224,0.2)' : 'rgba(232,255,71,0.15)'}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: file ? 'var(--accent2)' : 'var(--accent)',
          }}>
            {file ? <Music size={20} /> : <Upload size={20} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            {file ? (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--accent2)', fontFamily: 'var(--mono)', marginTop: 3 }}>
                  ✔ Ready to alter · click to change
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>Drop a MIDI file here</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 3 }}>.mid / .midi</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Step 2 — Describe */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text3)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: 'var(--mono)', marginBottom: 10 }}>
          Step 2 — Describe what to add
        </div>

        {/* Suggestion chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 12 }}>
          {SUGGESTIONS.map((s, i) => (
            <button key={i} onClick={() => setPrompt(s)} style={{
              padding: '5px 12px', borderRadius: 20,
              border: `1px solid ${prompt === s ? 'var(--accent)' : 'var(--border2)'}`,
              background: prompt === s ? 'rgba(232,255,71,0.08)' : 'var(--surface2)',
              color: prompt === s ? 'var(--accent)' : 'var(--text3)',
              fontSize: 11, cursor: 'pointer', transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => { if (prompt !== s) { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text2)' } }}
              onMouseLeave={e => { if (prompt !== s) { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text3)' } }}
            >
              {s}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() } }}
            placeholder="Describe what layers to add… e.g. add a warm cello harmony that follows the melody"
            rows={2}
            disabled={loading}
            style={{
              flex: 1, background: 'var(--surface2)',
              border: '1px solid var(--border)', borderRadius: 'var(--r)',
              padding: '11px 14px', color: 'var(--text)', fontSize: 13,
              resize: 'none', outline: 'none',
              transition: 'border-color 0.2s ease', lineHeight: 1.5,
            }}
            onFocus={e => e.target.style.borderColor = 'var(--border2)'}
            onBlur={e => e.target.style.borderColor = 'var(--border)'}
          />
          <button onClick={handleSubmit} disabled={!canSubmit} style={{
            width: 44, height: 44, borderRadius: 'var(--r-sm)', flexShrink: 0,
            background: canSubmit ? 'var(--accent)' : 'var(--surface3)',
            border: 'none', cursor: canSubmit ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: canSubmit ? '#000' : 'var(--text3)',
            transition: 'all 0.15s ease',
          }}
            onMouseEnter={e => { if (canSubmit) e.currentTarget.style.background = 'var(--accent-d)' }}
            onMouseLeave={e => { e.currentTarget.style.background = canSubmit ? 'var(--accent)' : 'var(--surface3)' }}
          >
            {loading
              ? <div style={{ width: 16, height: 16, border: '2px solid #000', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              : <Send size={15} />}
          </button>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 6 }}>
          Enter to send · Shift+Enter for newline
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-lg)', padding: '20px 24px',
          animation: 'fadeUp 0.3s ease forwards',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ display: 'flex', gap: 4 }}>
              {[0, 0.18, 0.36].map((d, i) => (
                <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--accent)', animation: `pulse 1.1s ease-in-out ${d}s infinite` }} />
              ))}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text2)' }}>Analysing and adding layers…</div>
          </div>
          <div style={{ height: 2, background: 'var(--border)', borderRadius: 1, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--accent), var(--accent2))', animation: 'genBar 1.8s ease-in-out infinite' }} />
          </div>
          <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 8 }}>
            Working…
          </div>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{
          fontSize: 12, color: 'var(--danger)',
          background: 'rgba(255,79,79,0.06)', border: '1px solid rgba(255,79,79,0.18)',
          borderRadius: 'var(--r-sm)', padding: '10px 14px',
          animation: 'fadeUp 0.25s ease forwards',
        }}>
          ⚠ {error}
        </div>
      )}

      {/* Result */}
      {result && !loading && (
        <div style={{
          background: 'var(--surface2)', border: '1px solid var(--border2)',
          borderRadius: 'var(--r-lg)', padding: '20px',
          animation: 'fadeUp 0.3s ease forwards',
        }}>
          <div style={{ fontSize: 11, color: 'var(--accent)', fontFamily: 'var(--mono)', marginBottom: 12, letterSpacing: 1 }}>
            ✔ DONE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12, flexShrink: 0,
              background: 'rgba(232,255,71,0.07)', border: '1px solid rgba(232,255,71,0.15)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <Music size={20} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {result.filename}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <span>{result.key}</span>
                <span>{result.tempo} BPM</span>
                <span>{result.bars} bars</span>
                <span style={{ color: 'var(--accent2)' }}>+{result.addedNotes} notes added</span>
              </div>
            </div>
            <button onClick={handleDownload} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 'var(--r-sm)',
              background: 'var(--accent)', color: '#000',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: 'none', transition: 'all 0.15s ease', flexShrink: 0,
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-d)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}
            >
              <Download size={13} /> Download
            </button>
          </div>

          {/* Try again nudge */}
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 11, color: 'var(--text3)' }}>Not what you wanted?</div>
            <button onClick={() => { setResult(null); setPrompt('') }} style={{
              fontSize: 11, color: 'var(--text2)', background: 'none',
              border: '1px solid var(--border)', borderRadius: 'var(--r-sm)',
              padding: '4px 10px', cursor: 'pointer', transition: 'all 0.15s ease',
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text2)' }}
            >
              Try again
            </button>
          </div>
        </div>
      )}
    </div>
  )
}