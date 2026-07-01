import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import {
  Search, ShieldCheck, CreditCard, Clock,
  ThumbsUp, Star, MapPin, ArrowRight, Users
} from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import { useNeighborhoods } from '../hooks/useNeighborhoods'

const TRUST_SIGNALS = [
  { icon: ShieldCheck, label: 'Verified Properties', desc: 'Every stay is verified' },
  { icon: CreditCard, label: 'Secure Payments', desc: 'Your money is protected' },
  { icon: Clock, label: '24/7 Support', desc: 'We\'re always here' },
  { icon: ThumbsUp, label: 'Best Price Guarantee', desc: 'Get the best value' },
]

const SAFETY_FEATURES = [
  { icon: Users, label: 'Verified Hosts', desc: 'Background checked' },
  { icon: ShieldCheck, label: 'Accurate Listings', desc: 'Photos & details verified' },
  { icon: CreditCard, label: 'Secure Payments', desc: 'Escrow protection' },
  { icon: Clock, label: 'Reliable Support', desc: '24/7 assistance' },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { neighborhoods } = useNeighborhoods()
  const [listings, setListings] = useState([])
  const [hourlyListings, setHourlyListings] = useState([])
  const [neighborhoodSearch, setNeighborhoodSearch] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [search, setSearch] = useState({
    neighborhood: '', check_in: '', check_out: '', guests: 1
  })

  const filteredNeighborhoods = neighborhoods.filter(n =>
    n.name.toLowerCase().includes(neighborhoodSearch.toLowerCase())
  )

  useEffect(() => {
    api.get('/listings/').then(res => setListings(res.data.slice(0, 4))).catch(() => {})
  }, [])

  useEffect(() => {
    api.get('/listings/?hourly=true')
      .then(res => setHourlyListings(res.data.slice(0, 4)))
      .catch(() => {})
  }, [])

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (search.neighborhood) params.set('neighborhood', search.neighborhood)
    if (search.guests > 1) params.set('max_guests', search.guests)
    navigate(`/browse?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-visible">
        {/* Background image — full screen on mobile, right side on desktop */}
        <div
          className="absolute inset-0 md:left-[45%] bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://res.cloudinary.com/dyqawsk0m/image/upload/v1778880529/ChatGPT_Image_May_16_2026_12_21_57_AM_2_lotbyi.png')" }}
        />

        {/* Overlay — stronger on mobile so text is readable over full bg image */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/90 to-[#0A0A0A]/60 md:from-[#0A0A0A] md:via-[#0A0A0A]/80 md:to-transparent" />

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto px-6 py-32 w-full">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 mb-6">
            <ShieldCheck size={13} className="text-gold" />
            <span className="text-white/80 text-xs font-medium tracking-wide">VERIFIED STAYS, ZERO STRESS</span>
          </div>

          {/* Heading */}
          <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-4 max-w-2xl">
            Book Verified Stays<br />
            You Can <span className="text-gold">Trust</span>
          </h1>

          {/* Subtext */}
          <p className="text-white/60 text-lg mb-10 max-w-md">
            Handpicked apartments in Nairobi.<br />
            Safe payments. Real hosts. No scams.
          </p>

          {/* Search bar */}
          <div className="bg-[#111111]/90 backdrop-blur-sm border border-white/10 rounded-2xl p-3 flex flex-col md:flex-row gap-2 max-w-3xl overflow-visible relative">

            {/* Where to — neighborhood autocomplete */}
            <div className="flex-1 relative">
              <div className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
                <MapPin size={16} className="text-gold shrink-0" />
                <input
                  type="text"
                  placeholder="Where to? Search location"
                  value={neighborhoodSearch}
                  onChange={e => {
                    setNeighborhoodSearch(e.target.value)
                    setShowSuggestions(true)
                    setSearch({ ...search, neighborhood: '' })
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  className="bg-transparent text-white placeholder-white/30 text-sm focus:outline-none w-full"
                />
              </div>
              {/* Dropdown */}
              {showSuggestions && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-[#111111] border border-white/10 rounded-xl z-[999] shadow-xl overflow-y-auto max-h-60">
                  {filteredNeighborhoods.length > 0 ? (
                    filteredNeighborhoods.map(n => (
                      <button
                        key={n.id}
                        onMouseDown={() => {
                          setNeighborhoodSearch(n.name)
                          setSearch({ ...search, neighborhood: n.name })
                          setShowSuggestions(false)
                        }}
                        className="w-full text-left px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-gold flex items-center gap-2 transition-colors"
                      >
                        <MapPin size={13} className="text-gold/50" />
                        {n.name}
                        <span className="text-white/20 text-xs ml-auto">{n.city}</span>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-white/30 text-sm">No neighborhoods found</div>
                  )}
                </div>
              )}
            </div>

            {/* Check in — Check out */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3">
              <Clock size={16} className="text-gold shrink-0" />
              <div>
                <p className="text-white/30 text-xs">Check In — Check Out</p>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={search.check_in}
                    onChange={e => setSearch({ ...search, check_in: e.target.value })}
                    className="bg-transparent text-white/70 text-xs focus:outline-none w-24"
                  />
                  <span className="text-white/20">→</span>
                  <input
                    type="date"
                    value={search.check_out}
                    onChange={e => setSearch({ ...search, check_out: e.target.value })}
                    className="bg-transparent text-white/70 text-xs focus:outline-none w-24"
                  />
                </div>
              </div>
            </div>

            {/* Guests */}
            <div className="flex items-center gap-2 bg-white/5 rounded-xl px-4 py-3">
              <Users size={16} className="text-gold shrink-0" />
              <div>
                <p className="text-white/30 text-xs">Guests</p>
                <select
                  value={search.guests}
                  onChange={e => setSearch({ ...search, guests: e.target.value })}
                  className="bg-transparent text-white text-sm focus:outline-none"
                >
                  {[1,2,3,4,5,6].map(n => (
                    <option key={n} value={n} className="bg-[#0A0A0A]">{n} Guest{n > 1 ? 's' : ''}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Search button */}
            <button
              onClick={handleSearch}
              className="bg-gold text-dark font-bold px-6 py-3 rounded-xl hover:bg-gold/90 transition-colors flex items-center gap-2 justify-center shrink-0"
            >
              <Search size={18} />
              Search
            </button>
          </div>
        </div>
      </section>

      {/* ── Trust signals ── */}
      <section className="py-8 border-b border-white/8 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TRUST_SIGNALS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-gold" />
                </div>
                <div>
                  <p className="text-white text-sm font-semibold">{label}</p>
                  <p className="text-white/40 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured listings ── */}
      <section className="py-16 bg-[#0A0A0A] border-t border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <div>
              <p className="text-gold text-xs font-semibold uppercase tracking-widest mb-1">Popular Stays</p>
              <h2 className="text-white text-3xl font-bold">Handpicked Stays in Nairobi</h2>
            </div>
            <Link
              to="/browse"
              className="flex items-center gap-2 text-white/50 text-sm hover:text-gold transition-colors border border-white/10 px-4 py-2 rounded-lg hover:border-gold/40"
            >
              View all stays
              <ArrowRight size={14} />
            </Link>
          </div>

          {listings.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {listings.map(listing => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20 text-white/20">
              <p>No listings yet. Check back soon.</p>
            </div>
          )}
        </div>
      </section>

      {hourlyListings.length > 0 && (
        <section className="py-16 px-4 max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white text-2xl font-bold">Need a Place by the Hour?</h2>
              <p className="text-white/40 text-sm mt-1">Book verified stays for a few hours, no overnight commitment</p>
            </div>
            <button
              onClick={() => navigate('/browse?hourly=true')}
              className="text-gold text-sm font-semibold hover:underline shrink-0"
            >
              See all →
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {hourlyListings.map(listing => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        </section>
      )}

      {/* ── Safety CTA ── */}
      <section className="py-16 bg-[#0A0A0A] border-t border-white/8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-[#111111] border border-white/8 rounded-2xl p-10 flex flex-col md:flex-row gap-10 items-center">
            {/* Left */}
            <div className="md:w-1/3">
              <h2 className="text-white text-3xl font-bold mb-3">
                Your Safety<br />is Our Priority
              </h2>
              <p className="text-white/40 text-sm leading-relaxed mb-6">
                We verify every property and host so you can book with peace of mind.
              </p>
              <button
                onClick={() => navigate('/about')}
                className="bg-gold text-dark font-bold px-6 py-3 rounded-xl hover:bg-gold/90 transition-colors text-sm"
              >
                Learn More
              </button>
            </div>

            {/* Right — 4 feature grid */}
            <div className="md:w-2/3 grid grid-cols-2 gap-5">
              {SAFETY_FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center shrink-0">
                    <Icon size={18} className="text-gold" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-semibold">{label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-8 border-t border-white/8 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src="https://res.cloudinary.com/dzczkq1nl/image/upload/t_cropped/ChatGPT_Image_Jun_30_2026_09_33_13_PM_oezlij.png"
              alt="The Dock City"
              className="h-8 w-auto object-contain"
            />
            <span className="text-white font-bold text-sm">The Dock City</span>
          </div>
          <div className="flex gap-5 text-white/30 text-xs">
            <Link to="/about" className="hover:text-white transition-colors">About</Link>
            <Link to="/contact" className="hover:text-white transition-colors">Contact</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
          </div>
        </div>
        <p className="text-white/30 text-xs mt-4">© 2026 The Dock City · Verified Stays, Zero Stress</p>
      </footer>
    </div>
  )
}

// Inline listing card for homepage
function ListingCard({ listing }) {
  const navigate = useNavigate()
  const photo = listing.photos?.[0] || 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'

  return (
    <div
      onClick={() => navigate(`/listings/${listing.id}`)}
      className="group cursor-pointer bg-[#111111] rounded-xl overflow-hidden border border-white/8 hover:border-gold/30 transition-all duration-300"
    >
      {/* Photo */}
      <div className="relative h-44 overflow-hidden">
        <img
          src={photo}
          alt={listing.title}
          className="h-full w-auto min-w-full object-contain object-center bg-[#0A0A0A] group-hover:scale-105 transition-transform duration-500"
        />
        {listing.verification_badges?.length > 0 && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-gold text-dark text-xs font-bold px-2 py-1 rounded-full">
            <ShieldCheck size={11} />
            Verified
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="text-white font-semibold text-sm leading-tight mb-1 line-clamp-1">
          {listing.title}
        </h3>
        <div className="flex items-center gap-1 text-white/40 text-xs mb-3">
          <MapPin size={11} />
          {listing.neighborhood}
        </div>
        <div className="flex items-center justify-between">
          <div>
            <span className="text-gold font-bold">
              KSh {listing.price_per_night_kes?.toLocaleString()}
            </span>
            <span className="text-white/30 text-xs"> /night</span>
          </div>
          {listing.average_rating > 0 && (
            <div className="flex items-center gap-1 text-white/50 text-xs">
              <Star size={11} fill="currentColor" className="text-gold" />
              {listing.average_rating}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}