import { useState, useEffect } from 'react'
import api from '../api/axios'

export function useNeighborhoods() {
  const [neighborhoods, setNeighborhoods] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/neighborhoods/')
      .then(res => setNeighborhoods(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { neighborhoods, loading }
}
