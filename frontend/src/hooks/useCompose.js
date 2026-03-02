// //E:\pro\midigenerator_v2\frontend\src\hooks\useCompose.js

import { useState, useCallback } from 'react'
import { compose, alterMidi } from '../services/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function useCompose() {
  const [messages,   setMessages]   = useState([])
  const [generating, setGenerating] = useState(false)

  const sendMessage = useCallback(async (text, file = null) => {
    if (!text.trim() || generating) return

    setMessages(prev => [...prev, {
      id: Date.now(), role: 'user', text,
      attached: file ? file.name : null,
    }])
    setGenerating(true)

    try {
      const result = file
        ? await alterMidi(file, text)
        : await compose({ prompt: text })

      const midiUrl = result.midiUrl?.startsWith('http')
        ? result.midiUrl
        : `${API_BASE}${result.midiUrl}`

      setMessages(prev => [...prev, {
        id:   Date.now() + 1,
        role: 'ai',
        text: file
          ? `Added ${result.addedNotes ?? '?'} new notes to your MIDI.`
          : `Composed ${result.bars} bars in ${result.key}, ${result.tempo} BPM.`,
        midi: {
          name: result.filename,
          url:  midiUrl,
          key:   result.key   || 'C',
          tempo: result.tempo || 120,
          bars:  result.bars  || 8,
          altered: !!file,
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
  }, [generating])

  const clear = useCallback(() => setMessages([]), [])

  return { messages, generating, sendMessage, clear }
}