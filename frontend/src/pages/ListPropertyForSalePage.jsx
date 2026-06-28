import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'
import PhotoUploader from '../components/PhotoUploader'
import MapPicker from '../components/MapPicker'
import { useNeighborhoods } from '../hooks/useNeighborhoods'

const AMENITIES_OPTIONS = [
  'WiFi', 'Parking', 'Swimming Pool', 'Gym', 'Generator',
  'Air Conditioning', 'DSTV', 'Security', 'Balcony', 'Kitchen',
  'Washing Machine', 'Hot Water', 'Study Desk', 'Smart TV', 'Garden',
  'Servant Quarter', 'Borehole', 'Solar', 'Elevator'
]

const PROPERTY_TYPES = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'house', label: 'House' },
  { value: 'townhouse', label: 'Townhouse' },
  { value: 'land', label: 'Land' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'villa', label: 'Villa' },
]

export default function ListPropertyForSalePage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { neighborhoods } = useNeighborhoods()
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const [form, setForm] = useState({
    title: '',
    description: '',
    property_type: 'apartment',
    neighborhood: '',
    city: 'Nairobi',
    area_description: '',
    full_address: '',
    bedrooms: 1,
    bathrooms: 1,
    size_sqft: '',
    sale_price_kes: '',
    is_also_for_rent: false,
    monthly_rent_kes: '',
    installments_available: false,
    seller_phone: user?.phone_number || '',
    seller_whatsapp: user?.phone_number || '',
    latitude: null,
    longitude: null,
    amenities: [],
    photos: [],
  })

  const toggleAmenity = (amenity) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }))
  }

  const validateStep1 = () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return false }
    if (!form.description.trim()) { toast.error('Description is required.'); return false }
    if (!form.neighborhood) { toast.error('Neighborhood is required.'); return false }
    if (!form.full_address.trim()) { toast.error('Address is required.'); return false }
    return true
  }

  const validateStep2 = () => {
    if (!form.sale_price_kes) { toast.error('Sale price is required.'); return false }
    if (form.photos.length < 3) { toast.error('At least 3 photos are required.'); return false }
    return true
  }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return
    setLoading(true)
    try {
      await api.post('/properties-for-sale/create/', {
        ...form,
        sale_price_kes: parseInt(form.sale_price_kes),
        monthly_rent_kes: form.monthly_rent_kes ? parseInt(form.monthly_rent_kes) : null,
        size_sqft: form.size_sqft ? parseInt(form.size_sqft) : null,
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseInt(form.bathrooms),
      })
      toast.success("Property submitted for review! We'll notify you once it's approved.")
      navigate('/')
    } catch (err) {
      const errors = err.response?.data
      if (typeof errors === 'object') {
        const first = Object.values(errors)[0]
        toast.error(Array.isArray(first) ? first[0] : first)
      } else {
        toast.error('Failed to submit property.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold">List Property for Sale</h1>
          <p className="text-white/40 text-sm mt-1">
            Your listing will be reviewed by our team before going live.
          </p>
        </div>

        <div className="flex items-center gap-2 mb-8">
          {[1, 2].map(s => (
            <div key={s} className="flex items-center gap-2">
              <button
                onClick={() => setStep(s)}
                className={`w-8 h-8 rounded-full text-sm font-bold transition-colors ${
                  step === s ? 'bg-gold text-dark' : 'bg-[#111111] text-white/40 border border-white/10'
                }`}
              >
                {s}
              </button>
              {s < 2 && <div className={`h-px w-16 ${step > s ? 'bg-gold' : 'bg-white/10'}`} />}
            </div>
          ))}
          <span className="text-white/40 text-sm ml-2">
            {step === 1 ? 'Property Details' : 'Pricing & Photos'}
          </span>
        </div>

        <div className="bg-[#111111] border border-white/8 rounded-2xl p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Property Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Modern 3BR House in Karen"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe the property..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Property Type</label>
                  <select
                    value={form.property_type}
                    onChange={e => setForm({ ...form, property_type: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  >
                    {PROPERTY_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Neighborhood</label>
                  <select
                    value={form.neighborhood}
                    onChange={e => setForm({ ...form, neighborhood: e.target.value })}
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  >
                    <option value="">Select...</option>
                    {neighborhoods.map(n => (
                      <option key={n.id} value={n.name}>{n.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Full Address</label>
                <input
                  type="text"
                  value={form.full_address}
                  onChange={e => setForm({ ...form, full_address: e.target.value })}
                  placeholder="e.g. House 12, Acacia Lane, Karen"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Area Description (public)</label>
                <input
                  type="text"
                  value={form.area_description}
                  onChange={e => setForm({ ...form, area_description: e.target.value })}
                  placeholder="e.g. Off Karen Road, near Junction Mall"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Bedrooms', key: 'bedrooms' },
                  { label: 'Bathrooms', key: 'bathrooms' },
                ].map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-white/50 text-xs mb-1 block">{label}</label>
                    <select
                      value={form[key]}
                      onChange={e => setForm({ ...form, [key]: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                    >
                      {[1,2,3,4,5,6,7,8].map(n => (
                        <option key={n} value={n}>{n}</option>
                      ))}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Size (sq ft)</label>
                  <input
                    type="number"
                    value={form.size_sqft}
                    onChange={e => setForm({ ...form, size_sqft: e.target.value })}
                    placeholder="Optional"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Your Phone</label>
                  <input
                    type="tel"
                    value={form.seller_phone}
                    onChange={e => setForm({ ...form, seller_phone: e.target.value })}
                    placeholder="07XX XXX XXX"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">WhatsApp Number</label>
                  <input
                    type="tel"
                    value={form.seller_whatsapp}
                    onChange={e => setForm({ ...form, seller_whatsapp: e.target.value })}
                    placeholder="07XX XXX XXX"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 block">
                  Pin Location <span className="text-white/30">(optional)</span>
                </label>
                <MapPicker
                  onLocationSelect={({ lat, lng }) => setForm({ ...form, latitude: lat, longitude: lng })}
                  initialLat={form.latitude}
                  initialLng={form.longitude}
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 block">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {AMENITIES_OPTIONS.map(amenity => (
                    <button
                      key={amenity}
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1.5 rounded-full text-xs border transition-colors ${
                        form.amenities.includes(amenity)
                          ? 'bg-gold text-dark border-gold font-semibold'
                          : 'border-white/10 text-white/50 hover:border-gold/40'
                      }`}
                    >
                      {amenity}
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => validateStep1() && setStep(2)}
                className="w-full bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 transition-colors"
              >
                Next - Pricing & Photos
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <label className="text-white/50 text-xs mb-1 block">
                  Sale Price (KES) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={form.sale_price_kes}
                  onChange={e => setForm({ ...form, sale_price_kes: e.target.value })}
                  placeholder="e.g. 15000000"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-white text-sm font-semibold">Also available for rent?</p>
                    <p className="text-white/30 text-xs mt-0.5">Dual-purpose - buyers can also rent it</p>
                  </div>
                  <button
                    onClick={() => setForm({ ...form, is_also_for_rent: !form.is_also_for_rent })}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                      form.is_also_for_rent ? 'bg-gold' : 'bg-white/10'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                      form.is_also_for_rent ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>
                {form.is_also_for_rent && (
                  <div className="mt-3 pt-3 border-t border-white/8">
                    <label className="text-white/50 text-xs mb-1 block">Monthly Rent (KES)</label>
                    <input
                      type="number"
                      value={form.monthly_rent_kes}
                      onChange={e => setForm({ ...form, monthly_rent_kes: e.target.value })}
                      placeholder="e.g. 80000"
                      className="w-full bg-[#111111] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                <div>
                  <p className="text-white text-sm font-semibold">Installments / Mortgage Available</p>
                  <p className="text-white/30 text-xs mt-0.5">Buyers can pay in installments</p>
                </div>
                <button
                  onClick={() => setForm({ ...form, installments_available: !form.installments_available })}
                  className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                    form.installments_available ? 'bg-gold' : 'bg-white/10'
                  }`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                    form.installments_available ? 'translate-x-6' : 'translate-x-0.5'
                  }`} />
                </button>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 block">
                  Photos <span className="text-red-400">* minimum 3</span>
                </label>
                <PhotoUploader
                  photos={form.photos}
                  onChange={urls => setForm({ ...form, photos: urls })}
                  minPhotos={3}
                  maxPhotos={15}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-white/10 text-white/50 py-3 rounded-xl text-sm hover:border-white/30"
                >
                  Back
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                  ) : 'Submit for Review'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
