//E:\pro\midigenerator_v2\frontend\src\hooks\useKnowledge.js


import { useState, useEffect, useCallback } from 'react'
import { getKnowledge, deleteKnowledge } from '../services/api.js'

export function useKnowledge() {
  const [items,   setItems]   = useState([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const fetchItems = useCallback(async () => {
    setLoading(true); setError(null)
    try { setItems(await getKnowledge()) }
    catch (e) { setError(e.message) }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const addItem = useCallback((item) => {
    setItems(prev => [item, ...prev.filter(i => i.name !== item.name)])
  }, [])

  const removeItem = useCallback(async (id) => {
    setError(null)
    try {
      await deleteKnowledge(id)
      setItems(prev => prev.filter(i => i.id !== id))
    } catch (e) { setError(e.message) }
  }, [])

  return { items, loading, error, addItem, removeItem, refresh: fetchItems }
}