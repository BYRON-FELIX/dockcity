import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MapPin, Phone, MessageCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import Navbar from '../components/Navbar'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function PropertySaleDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [property, setProperty] = useState(null)
  const [loading, setLoading] = useState(true)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [viewingModal, setViewingModal] = useState(false)
  const [viewingLoading, setViewingLoading] = useState(false)
  const [form, setForm] = useState({
    buyer_name: '',
    buyer_email: '',
    buyer_phone: '',
    preferred_date: '',
    preferred_time: '',
    message: '',
  })

  useEffect(() => {
    api.get(`/properties-for-sale/${id}/`)
      .then(res => setProperty(res.data))
      .catch(() => navigate('/properties-for-sale'))
      .finally(() => setLoading(false))
  }, [id])

  const handleSubmitViewing = async () => {
    if (!form.buyer_name || !form.buyer_email || !form.buyer_phone || !form.preferred_date) {
      return toast.error('Please fill in all required fields.')
    }
    setViewingLoading(true)
    try {
      await api.post(`/properties-for-sale/${id}/request-viewing/`, form)
      toast.success("Viewing request submitted! We'll be in touch shortly.")
      setViewingModal(false)
      setForm({ buyer_name: '', buyer_email: '', buyer_phone: '', preferred_date: '', preferred_time: '', message: '' })
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit request.')
    } finally {
      setViewingLoading(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!property) return null

  const photos = property.photos || []

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-[#0A0A0A]" style={{ aspectRatio: '16/9', maxHeight: '500px' }}>
          {photos.length > 0 ? (
            <>
              <img
                src={photos[photoIndex]}
                alt={property.title}
                className="absolute inset-0 w-full h-full object-contain object-center"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/60 rounded-full flex items-center justify-center text-white hover:bg-black/80"
                  >
                    <ChevronRight size={18} />
                  </button>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === photoIndex ? 'bg-gold' : 'bg-white/30'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20">No photos</div>
          )}

          <div className="absolute top-3 left-3 flex gap-2 flex-wrap">
            <span className="bg-gold text-dark text-xs font-bold px-3 py-1 rounded-full">For Sale</span>
            {property.is_also_for_rent && (
              <span className="bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">Also for Rent</span>
            )}
            {property.verification_badges?.map(badge => (
              <span key={badge} className="bg-white/10 text-white text-xs px-3 py-1 rounded-full border border-white/20">
                {badge}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h1 className="text-white text-2xl font-bold mb-2">{property.title}</h1>
              <div className="flex items-center gap-1 text-white/50 text-sm">
                <MapPin size={14} />
                {property.neighborhood}, {property.city}
              </div>
              {property.area_description && (
                <p className="text-white/30 text-sm mt-1">{property.area_description}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Bedrooms', value: property.bedrooms, icon: 'BED' },
                { label: 'Bathrooms', value: property.bathrooms, icon: 'BATH' },
                { label: 'Size', value: property.size_sqft ? `${property.size_sqft} sq ft` : 'N/A', icon: 'SIZE' },
              ].map(({ label, value, icon }) => (
                <div key={label} className="bg-[#111111] border border-white/8 rounded-xl p-3 text-center">
                  <p className="text-white/30 text-xs mb-1">{icon}</p>
                  <p className="text-white font-semibold text-sm">{value}</p>
                  <p className="text-white/40 text-xs">{label}</p>
                </div>
              ))}
            </div>

            <div className="bg-[#111111] border border-white/8 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-3">About this property</h3>
              <p className="text-white/60 text-sm leading-relaxed">{property.description}</p>
            </div>

            {property.amenities?.length > 0 && (
              <div className="bg-[#111111] border border-white/8 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3">Amenities</h3>
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map(a => (
                    <span key={a} className="bg-gold/10 text-gold border border-gold/20 text-xs px-3 py-1 rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-[#111111] border border-white/8 rounded-2xl p-5 sticky top-24">
              <p className="text-white/40 text-xs uppercase tracking-wider mb-1">Sale Price</p>
              <p className="text-gold font-bold text-3xl mb-1">
                KES {property.sale_price_kes?.toLocaleString()}
              </p>
              {property.is_also_for_rent && property.monthly_rent_kes && (
                <p className="text-white/40 text-sm mb-4">
                  Also available for rent at KES {property.monthly_rent_kes?.toLocaleString()}/month
                </p>
              )}
              {property.installments_available && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2 mb-4">
                  <p className="text-green-400 text-xs font-semibold">Installments / Mortgage Available</p>
                </div>
              )}

              <button
                onClick={() => setViewingModal(true)}
                className="w-full bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 transition-colors mb-3"
              >
                Schedule a Viewing
              </button>

              {property.seller_whatsapp && (
                <a
                  href={`https://wa.me/${property.seller_whatsapp.replace(/\D/g, '')}?text=Hi, I'm interested in your property "${property.title}" listed on Dock City.`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 border border-green-500/30 text-green-400 font-semibold py-3 rounded-xl hover:bg-green-500/10 transition-colors mb-3"
                >
                  <MessageCircle size={16} />
                  WhatsApp Seller
                </a>
              )}

              {property.seller_phone && (
                <a
                  href={`tel:${property.seller_phone}`}
                  className="w-full flex items-center justify-center gap-2 border border-white/10 text-white/60 py-3 rounded-xl hover:border-white/30 transition-colors"
                >
                  <Phone size={16} />
                  Call Seller
                </a>
              )}

              <p className="text-white/20 text-xs text-center mt-4">
                Listed on Dock City - Verified platform
              </p>
            </div>
          </div>
        </div>
      </div>

      {viewingModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Schedule a Viewing</h3>
            <p className="text-white/40 text-sm mb-5">
              Fill in your details and we'll coordinate the viewing with the seller.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Full Name <span className="text-red-400">*</span></label>
                <input
                  type="text"
                  value={form.buyer_name}
                  onChange={e => setForm({ ...form, buyer_name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Email <span className="text-red-400">*</span></label>
                <input
                  type="email"
                  value={form.buyer_email}
                  onChange={e => setForm({ ...form, buyer_email: e.target.value })}
                  placeholder="your@email.com"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Phone <span className="text-red-400">*</span></label>
                <input
                  type="tel"
                  value={form.buyer_phone}
                  onChange={e => setForm({ ...form, buyer_phone: e.target.value })}
                  placeholder="07XX XXX XXX"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Preferred Date <span className="text-red-400">*</span></label>
                  <input
                    type="date"
                    value={form.preferred_date}
                    onChange={e => setForm({ ...form, preferred_date: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Preferred Time</label>
                  <input
                    type="time"
                    value={form.preferred_time}
                    onChange={e => setForm({ ...form, preferred_time: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Message (optional)</label>
                <textarea
                  rows={3}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Any specific questions or requirements..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setViewingModal(false)}
                className="flex-1 border border-white/10 text-white/50 py-3 rounded-xl text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitViewing}
                disabled={viewingLoading}
                className="flex-1 bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 disabled:opacity-50 flex items-center justify-center"
              >
                {viewingLoading ? (
                  <div className="w-5 h-5 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                ) : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
