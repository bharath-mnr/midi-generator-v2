
// frontend/src/hooks/useCompose.js
// Added: `model` state ('aria' | 'opus') + `setModel` — passed to API calls

import { useState, useCallback } from 'react'
import { compose, alterMidi } from '../services/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function useCompose() {
  const [messages,   setMessages]   = useState([])
  const [generating, setGenerating] = useState(false)
  const [model,      setModel]      = useState('aria')  // 'aria' | 'opus'

  const sendMessage = useCallback(async (text, file = null) => {
    if (!text.trim() || generating) return

    setMessages(prev => [...prev, {
      id: Date.now(), role: 'user', text,
      attached: file ? file.name : null,
    }])
    setGenerating(true)

    try {
      // For alter we still default to 'aria' — you can pass model to alterMidi too
      const result = file
        ? await alterMidi(file, text, model)
        : await compose({ prompt: text, model })

      const midiUrl = result.midiUrl?.startsWith('http')
        ? result.midiUrl
        : `${API_BASE}${result.midiUrl}`

      // Use the model label returned by the backend (confirms what was actually used)
      const usedModel  = result.model || model
      const modelLabel = usedModel === 'opus' ? 'Opus' : 'Aria'

      setMessages(prev => [...prev, {
        id:   Date.now() + 1,
        role: 'ai',
        text: file
          ? `Added ${result.addedNotes ?? '?'} new notes via ${modelLabel}.`
          : `Composed ${result.bars} bars in ${result.key}, ${result.tempo} BPM — via ${modelLabel}.`,
        midi: {
          name:    result.filename,
          url:     midiUrl,
          key:     result.key   || 'C',
          tempo:   result.tempo || 120,
          bars:    result.bars  || 8,
          altered: !!file,
          model:   usedModel,
        },
      }])
    } catch (err) {
      setMessages(prev => [...prev, {
        id:   Date.now() + 1,
        role: 'ai',
        text: `Failed — ${err.message}`,
        error: true,
      }])
    } finally {
      setGenerating(false)
    }
  }, [generating, model])

  const clear = useCallback(() => setMessages([]), [])

  return { messages, generating, sendMessage, clear, model, setModel }
}