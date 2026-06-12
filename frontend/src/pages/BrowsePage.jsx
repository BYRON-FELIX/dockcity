import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidersHorizontal, X } from 'lucide-react'
import Navbar from '../components/Navbar'
import ListingCard from '../components/ListingCard'
import api from '../api/axios'
import { useNeighborhoods } from '../hooks/useNeighborhoods'

const AMENITIES = [
  'WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Generator',
  'Air Conditioning', 'DSTV', 'Security', 'Balcony', 'Kitchen'
]

export default function BrowsePage() {
  const [searchParams] = useSearchParams()
  const { neighborhoods } = useNeighborhoods()
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  const [filters, setFilters] = useState({
    neighborhood: searchParams.get('neighborhood') || '',
    min_price: '',
    max_price: '',
    bedrooms: '',
    max_guests: searchParams.get('max_guests') || '',
  })

  const fetchListings = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      Object.entries(filters).forEach(([key, val]) => {
        if (val) params.set(key, val)
      })
      const res = await api.get(`/listings/?${params.toString()}`)
      setListings(res.data)
    } catch {
      setListings([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchListings() }, [])

  const handleFilter = () => {
    fetchListings()
    setShowFilters(false)
  }

  const clearFilters = () => {
    setFilters({ neighborhood: '', min_price: '', max_price: '', bedrooms: '', max_guests: '' })
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-white text-2xl font-bold">
              {filters.neighborhood ? `Stays in ${filters.neighborhood}` : 'All Verified Stays'}
            </h1>
            <p className="text-white/40 text-sm mt-1">{listings.length} properties found</p>
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 border border-white/20 px-4 py-2 rounded-lg text-sm text-white/70 hover:border-gold hover:text-gold transition-colors"
          >
            <SlidersHorizontal size={16} />
            Filters
          </button>
        </div>

        <div className="flex gap-6">
          {/* Filter sidebar */}
          {showFilters && (
            <div className="w-72 shrink-0 bg-[#111111] border border-white/8 rounded-xl p-5 h-fit">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-white font-semibold">Filters</h3>
                <button onClick={() => setShowFilters(false)}>
                  <X size={18} className="text-white/40 hover:text-white" />
                </button>
              </div>

              {/* Neighborhood */}
              <div className="mb-5">
                <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">
                  Neighborhood
                </label>
                <select
                  value={filters.neighborhood}
                  onChange={e => setFilters({ ...filters, neighborhood: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                >
                  <option value="">Any</option>
                  {neighborhoods.map(n => (
                    <option key={n.id} value={n.name}>{n.name}</option>
                  ))}
                </select>
              </div>

              {/* Price range */}
              <div className="mb-5">
                <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">
                  Price per Night (KES)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.min_price}
                    onChange={e => setFilters({ ...filters, min_price: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.max_price}
                    onChange={e => setFilters({ ...filters, max_price: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div className="mb-5">
                <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">
                  Bedrooms
                </label>
                <div className="flex gap-2">
                  {['Any', '1', '2', '3', '4+'].map(b => (
                    <button
                      key={b}
                      onClick={() => setFilters({ ...filters, bedrooms: b === 'Any' ? '' : b })}
                      className={`flex-1 py-2 rounded-lg text-xs border transition-colors ${
                        (b === 'Any' && !filters.bedrooms) || filters.bedrooms === b
                          ? 'bg-gold text-dark border-gold font-semibold'
                          : 'border-white/10 text-white/60 hover:border-gold/40'
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guests */}
              <div className="mb-6">
                <label className="text-white/60 text-xs uppercase tracking-wider mb-2 block">
                  Guests
                </label>
                <select
                  value={filters.max_guests}
                  onChange={e => setFilters({ ...filters, max_guests: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                >
                  <option value="">Any</option>
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n}>{n}+</option>
                  ))}
                </select>
              </div>

              <button
                onClick={handleFilter}
                className="w-full bg-gold text-dark font-bold py-3 rounded-lg hover:bg-gold/90 transition-colors text-sm mb-2"
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className="w-full border border-white/10 text-white/50 py-2 rounded-lg text-sm hover:border-white/30 transition-colors"
              >
                Clear All
              </button>
            </div>
          )}

          {/* Listings grid */}
          <div className="flex-1">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-[#111111] rounded-xl h-64 animate-pulse border border-white/8" />
                ))}
              </div>
            ) : listings.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            ) : (
              <div className="text-center py-32">
                <p className="text-white/30 text-lg mb-2">No listings found</p>
                <p className="text-white/20 text-sm">Try adjusting your filters</p>
                <button
                  onClick={clearFilters}
                  className="mt-6 border border-gold/40 text-gold px-6 py-2 rounded-lg text-sm hover:bg-gold hover:text-dark transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}