import { useEffect, useRef } from 'react'
import api from '../api/axios'

export function useBookingPolling(onUpdate, intervalMs = 10000) {
  const intervalRef = useRef(null)

  useEffect(() => {
    // Poll every 10 seconds
    intervalRef.current = setInterval(async () => {
      try {
        const res = await api.get('/bookings/guest/me/')
        onUpdate(res.data)
      } catch {}
    }, intervalMs)

    return () => clearInterval(intervalRef.current)
  }, [])
}