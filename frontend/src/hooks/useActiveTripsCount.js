import { useState, useEffect } from 'react'
import api from '../api/axios'

export function useActiveTripsCount(enabled) {
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!enabled) return

    const fetchCount = () => {
      api.get('/bookings/guest/active-count/')
        .then(res => setCount(res.data.active_count))
        .catch(() => {})
    }

    fetchCount()
    const interval = setInterval(fetchCount, 15000) // refresh every 15s
    return () => clearInterval(interval)
  }, [enabled])

  return count
}
