import { useEffect, useState } from 'react'
import api from '../api/axios'

const FALLBACK_AMENITIES = {
  listing: [
    'WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Generator',
    'Air Conditioning', 'DSTV', 'Security', 'Balcony', 'Kitchen',
    'Washing Machine', 'Hot Water', 'Study Desk', 'Smart TV',
  ],
  property: [
    'WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Generator',
    'Air Conditioning', 'DSTV', 'Security', 'Balcony', 'Kitchen',
    'Washing Machine', 'Hot Water', 'Study Desk', 'Smart TV', 'Garden',
    'Servant Quarter', 'Borehole', 'Solar', 'Elevator',
  ],
}

export function useAmenities(target = 'listing') {
  const normalizedTarget = target === 'property' ? 'property' : 'listing'
  const [amenities, setAmenities] = useState(FALLBACK_AMENITIES[normalizedTarget])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    api
      .get(`/amenities/?target=${normalizedTarget}`)
      .then((res) => {
        if (!isMounted) return
        const names = Array.isArray(res.data)
          ? res.data.map((item) => item.name).filter(Boolean)
          : []
        if (names.length > 0) {
          setAmenities(names)
        }
      })
      .catch(() => {
        if (!isMounted) return
        setAmenities(FALLBACK_AMENITIES[normalizedTarget])
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [normalizedTarget])

  return { amenities, loading }
}
