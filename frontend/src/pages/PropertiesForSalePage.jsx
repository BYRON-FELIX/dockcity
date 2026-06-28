import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Bed, Bath, Search } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import toast from 'react-hot-toast'

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'villa', label: 'Villa' },
]

export default function PropertiesForSalePage() {
  const navigate = useNavigate()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    neighborhood: '',
    type: '',
    min_price: '',
    max_price: '',
    for_rent: false,
  })

  useEffect(() => {
    fetchProperties()
  }, [])

  const fetchProperties = async (activeFilters = filters) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (activeFilters.neighborhood) params.append('neighborhood', activeFilters.neighborhood)
      if (activeFilters.type) params.append('type', activeFilters.type)
      if (activeFilters.min_price) params.append('min_price', activeFilters.min_price)
      if (activeFilters.max_price) params.append('max_price', activeFilters.max_price)
      if (activeFilters.for_rent) params.append('for_rent', 'true')

      const res = await api.get(`/properties-for-sale/?${params.toString()}`)
      setProperties(res.data)
    } catch {
      toast.error('Failed to load properties.')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = () => fetchProperties(filters)

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-white text-3xl font-bold">Properties for Sale</h1>
          <p className="text-white/40 text-sm mt-2">
            Verified properties - apartments, houses, land and more across Nairobi
          </p>
        </div>

        <div className="bg-[#111111] border border-white/8 rounded-2xl p-4 mb-8 flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Neighborhood..."
            value={filters.neighborhood}
            onChange={e => setFilters({ ...filters, neighborhood: e.target.value })}
            className="bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold flex-1 min-w-32"
          />
          <select
            value={filters.type}
            onChange={e => setFilters({ ...filters, type: e.target.value })}
            className="bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
          >
            {PROPERTY_TYPES.map(t => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Min price (KES)"
            value={filters.min_price}
            onChange={e => setFilters({ ...filters, min_price: e.target.value })}
            className="bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold w-36"
          />
          <input
            type="number"
            placeholder="Max price (KES)"
            value={filters.max_price}
            onChange={e => setFilters({ ...filters, max_price: e.target.value })}
            className="bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold w-36"
          />
          <button
            onClick={() => setFilters({ ...filters, for_rent: !filters.for_rent })}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
              filters.for_rent
                ? 'bg-gold text-dark border-gold'
                : 'border-white/10 text-white/50 hover:border-gold/40'
            }`}
          >
            Also for Rent
          </button>
          <button
            onClick={handleSearch}
            className="bg-gold text-dark font-bold px-4 py-2 rounded-lg flex items-center gap-2 text-sm hover:bg-gold/90"
          >
            <Search size={14} />
            Search
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
          </div>
        ) : properties.length === 0 ? (
          <div className="text-center py-24 text-white/30">
            <p className="text-lg">No properties found</p>
            <p className="text-sm mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map(property => (
              <div
                key={property.id}
                onClick={() => navigate(`/properties-for-sale/${property.id}`)}
                className="bg-[#111111] border border-white/8 rounded-2xl overflow-hidden cursor-pointer hover:border-gold/30 transition-colors group"
              >
                <div className="relative h-48 bg-[#0A0A0A]">
                  {property.photos?.[0] ? (
                    <img
                      src={property.photos[0]}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/10">
                      No photo
                    </div>
                  )}
                  <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                    <span className="bg-gold text-dark text-[10px] font-bold px-2 py-1 rounded-full">
                      For Sale
                    </span>
                    {property.is_also_for_rent && (
                      <span className="bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-full">
                        Also for Rent
                      </span>
                    )}
                    {property.verification_badges?.map(badge => (
                      <span key={badge} className="bg-white/10 text-white text-[10px] px-2 py-1 rounded-full">
                        {badge}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <h3 className="text-white font-semibold mb-1 line-clamp-1">{property.title}</h3>
                  <div className="flex items-center gap-1 text-white/40 text-xs mb-3">
                    <MapPin size={11} />
                    {property.neighborhood}, {property.city}
                  </div>

                  <div className="flex items-center gap-3 text-white/50 text-xs mb-3">
                    <span className="flex items-center gap-1">
                      <Bed size={12} /> {property.bedrooms} bed
                    </span>
                    <span className="flex items-center gap-1">
                      <Bath size={12} /> {property.bathrooms} bath
                    </span>
                    {property.size_sqft && (
                      <span>{property.size_sqft} sq ft</span>
                    )}
                  </div>

                  <div className="border-t border-white/8 pt-3">
                    <p className="text-gold font-bold text-lg">
                      KES {property.sale_price_kes?.toLocaleString()}
                    </p>
                    {property.is_also_for_rent && property.monthly_rent_kes && (
                      <p className="text-white/40 text-xs mt-0.5">
                        or KES {property.monthly_rent_kes?.toLocaleString()}/month
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
