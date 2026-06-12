import { useState, useCallback, useRef } from 'react'
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api'
import { MapPin, Search } from 'lucide-react'

const NAIROBI_CENTER = { lat: -1.2921, lng: 36.8219 }

const MAP_STYLES = [
  { elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#ffffff' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2a2a2a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#111111' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0a0a0a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#E8A020' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1a1a1a' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#333333' }] },
]

export default function MapPicker({ onLocationSelect, initialLat, initialLng }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: apiKey || '',
    libraries: ['places'],
  })

  const [marker, setMarker] = useState(
    initialLat && initialLng
      ? { lat: parseFloat(initialLat), lng: parseFloat(initialLng) }
      : null
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const mapRef = useRef(null)

  const onMapLoad = useCallback((map) => {
    mapRef.current = map
  }, [])

  const handleMapClick = useCallback((e) => {
    const lat = e.latLng.lat()
    const lng = e.latLng.lng()
    setMarker({ lat, lng })
    onLocationSelect({ lat, lng })
  }, [onLocationSelect])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode({ address: searchQuery + ', Nairobi' }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const location = results[0].geometry.location
          const lat = location.lat()
          const lng = location.lng()
          setMarker({ lat, lng })
          onLocationSelect({ lat, lng })
          mapRef.current?.panTo({ lat, lng })
          mapRef.current?.setZoom(17)
        }
        setSearching(false)
      })
    } catch {
      setSearching(false)
    }
  }

  if (!apiKey) {
    return (
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-6 text-center">
        <MapPin size={24} className="text-white/20 mx-auto mb-2" />
        <p className="text-white/40 text-sm">Map picker unavailable</p>
        <p className="text-white/20 text-xs mt-1">Add VITE_GOOGLE_MAPS_API_KEY to .env to enable</p>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="bg-[#0A0A0A] border border-red-500/20 rounded-xl p-4 text-center">
        <p className="text-red-400 text-sm">Failed to load Google Maps</p>
        <p className="text-white/30 text-xs mt-1">Check your API key</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="bg-[#0A0A0A] border border-white/10 rounded-xl h-64 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Search bar */}
      <div className="flex gap-2">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="Search for your building or street..."
          className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-gold"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="bg-gold text-dark font-bold px-4 py-2 rounded-lg hover:bg-gold/90 transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
        >
          {searching ? (
            <div className="w-4 h-4 border-2 border-dark border-t-transparent rounded-full animate-spin" />
          ) : (
            <Search size={16} />
          )}
          Find
        </button>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden border border-white/10">
        <GoogleMap
          mapContainerStyle={{ width: '100%', height: '350px' }}
          center={marker || NAIROBI_CENTER}
          zoom={marker ? 17 : 13}
          onClick={handleMapClick}
          onLoad={onMapLoad}
          options={{
            styles: MAP_STYLES,
            disableDefaultUI: false,
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
        >
          {marker && (
            <Marker
              position={marker}
              draggable={true}
              onDragEnd={(e) => {
                const lat = e.latLng.lat()
                const lng = e.latLng.lng()
                setMarker({ lat, lng })
                onLocationSelect({ lat, lng })
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* Instructions */}
      <div className="flex items-start gap-2 text-xs text-white/30">
        <MapPin size={12} className="shrink-0 mt-0.5 text-gold/50" />
        <p>
          {marker
            ? `Pin set at ${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)} — drag to adjust`
            : 'Search for your location or click on the map to drop a pin'
          }
        </p>
      </div>
    </div>
  )
}