
//E:\pro\midigenerator_v2\frontend\src\hooks\useHistory.js
import { useState, useEffect, useCallback } from 'react'
import { getHistory, getHistoryItem } from '../services/api.js'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export function useHistory() {
  const [items, setItems]     = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState(null)

  const fetchHistory = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getHistory()
      setItems(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchHistory() }, [fetchHistory])

  const redownload = useCallback(async (id) => {
    try {
      const item = await getHistoryItem(id)
      if (item.midiUrl) {
        const url = item.midiUrl.startsWith('http')
          ? item.midiUrl
          : `${API_BASE}${item.midiUrl}`
        const a = document.createElement('a')
        a.href = url
        a.download = item.filename || `composition_${id}.mid`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
      }
    } catch (err) {
      console.error('Redownload failed:', err)
    }
  }, [])

  return { items, loading, error, redownload, refresh: fetchHistory }
}