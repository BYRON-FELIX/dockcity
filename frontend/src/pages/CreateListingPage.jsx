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
  'Washing Machine', 'Hot Water', 'Study Desk', 'Smart TV'
]

export default function CreateListingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { neighborhoods } = useNeighborhoods()

  const [form, setForm] = useState({
   title: '',
    description: '',
    neighborhood: '',
    city: 'Nairobi',
    full_address: '',
    area_description: '',
    price_per_night_kes: '',
    price_per_week_kes: '',
    price_per_month_kes: '',
    max_guests: 1,
    bedrooms: 1,
    bathrooms: 1,
    house_rules: '',
    amenities: [],
    photos: [],
    latitude: null,
    longitude: null,
    caretaker_name: '',
    caretaker_phone: '',
  })


  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)

  const toggleAmenity = (amenity) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }))
  }

  const validateStep1 = () => {
    if (!form.title.trim()) {
      toast.error('Title is required.')
      return false
    }
    if (!form.description.trim()) {
      toast.error('Description is required.')
      return false
    }
    if (!form.neighborhood) {
      toast.error('Neighborhood is required.')
      return false
    }
    if (!form.full_address.trim()) {
      toast.error('Full address is required.')
      return false
    }
    return true
  }

  

  

  const validateStep2 = () => {
    if (!form.price_per_night_kes) return toast.error('Price per night is required.')
    if (form.photos.length < 5) return toast.error('At least 5 photos are required.')
    return true
  }

  const handleSubmit = async (asDraft = true) => {
    if (!validateStep1() || !validateStep2()) return
    setLoading(true)
    try {
      const res = await api.post('/host/listings/', {
        ...form,
        latitude: form.latitude,
        longitude: form.longitude,
        price_per_night_kes: parseInt(form.price_per_night_kes),
        price_per_week_kes: form.price_per_week_kes ? parseInt(form.price_per_week_kes) : null,
        price_per_month_kes: form.price_per_month_kes ? parseInt(form.price_per_month_kes) : null,
        max_guests: parseInt(form.max_guests),
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseInt(form.bathrooms),
      })

      if (!asDraft) {
        // Submit for review immediately
        await api.post(`/host/listings/${res.data.id}/submit/`)
        toast.success('Listing submitted for admin review!')
      } else {
        toast.success('Listing saved as draft.')
      }

      navigate('/dashboard/host')
    } catch (err) {
      const errors = err.response?.data
      if (typeof errors === 'object') {
        const first = Object.values(errors)[0]
        toast.error(Array.isArray(first) ? first[0] : first)
      } else {
        toast.error('Failed to create listing.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold">Create a Listing</h1>
          <p className="text-white/40 text-sm mt-1">
            Your listing will be reviewed by our team before going live.
          </p>
        </div>

        {/* Step indicator */}
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

          {/* Step 1 — Property Details */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Listing Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="e.g. Modern 1BR Apartment in Westlands"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Description</label>
                <textarea
                  rows={4}
                  value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  placeholder="Describe your property..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="text-white/50 text-xs mb-1 block">City</label>
                  <input
                    type="text"
                    value={form.city}
                    disabled
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white/40 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">
                  Full Address <span className="text-white/30">(shown to guest only after payment)</span>
                </label>
                <input
                  type="text"
                  value={form.full_address}
                  onChange={e => setForm({ ...form, full_address: e.target.value })}
                  placeholder="e.g. Apt 4B, Sunrise Apartments, Westlands Road"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">
                  Area Description <span className="text-white/30">(shown publicly)</span>
                </label>
                <input
                  type="text"
                  value={form.area_description}
                  onChange={e => setForm({ ...form, area_description: e.target.value })}
                  placeholder="e.g. Near Westgate Mall, Westlands"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

            {/* Map Picker */}
            <div>
              <label className="text-white/50 text-xs mb-2 block">
                Pin Your Exact Location
                <span className="text-white/30 ml-1">(guests get directions to this pin)</span>
              </label>
              <MapPicker
                onLocationSelect={({ lat, lng }) => {
                  setForm({ ...form, latitude: lat, longitude: lng })
                }}
                initialLat={form.latitude}
                initialLng={form.longitude}
              />
              {form.latitude && (
                <p className="text-green-400 text-xs mt-1">
                  ✓ Location pinned successfully
                </p>
              )}
            </div>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Max Guests', key: 'max_guests' },
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
              </div>

              {/* Amenities */}
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

              {/* House rules */}
              <div>
                <label className="text-white/50 text-xs mb-1 block">House Rules (optional)</label>
                <textarea
                  rows={2}
                  value={form.house_rules}
                  onChange={e => setForm({ ...form, house_rules: e.target.value })}
                  placeholder="No smoking, no parties..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <button
                onClick={() => validateStep1() && setStep(2)}
                className="w-full bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 transition-colors"
              >
                Next — Pricing & Photos
              </button>

              {/* Caretaker */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Caretaker Name</label>
                  <input
                    type="text"
                    value={form.caretaker_name}
                    onChange={e => setForm({ ...form, caretaker_name: e.target.value })}
                    placeholder="Full name"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Caretaker Phone</label>
                  <input
                    type="tel"
                    value={form.caretaker_phone}
                    onChange={e => setForm({ ...form, caretaker_phone: e.target.value })}
                    placeholder="07XX XXX XXX"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Pricing & Photos */}
          {step === 2 && (
            <div className="space-y-5">
              {/* Pricing */}
              <div>
                <label className="text-white/50 text-xs mb-1 block">
                  Price per Night (KES) <span className="text-red-400">*</span>
                </label>
                <input
                  type="number"
                  value={form.price_per_night_kes}
                  onChange={e => setForm({ ...form, price_per_night_kes: e.target.value })}
                  placeholder="e.g. 5000"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Price per Week (KES)</label>
                  <input
                    type="number"
                    value={form.price_per_week_kes}
                    onChange={e => setForm({ ...form, price_per_week_kes: e.target.value })}
                    placeholder="Optional"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Price per Month (KES)</label>
                  <input
                    type="number"
                    value={form.price_per_month_kes}
                    onChange={e => setForm({ ...form, price_per_month_kes: e.target.value })}
                    placeholder="Optional"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>


              {/* Info box */}
              {/* Photos */}
              <div>
                <label className="text-white/50 text-xs mb-2 block">
                  Property Photos <span className="text-red-400">* minimum 5</span>
                </label>
                <PhotoUploader
                  photos={form.photos}
                  onChange={(urls) => setForm({ ...form, photos: urls })}
                  minPhotos={5}
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
                  onClick={() => handleSubmit(true)}
                  disabled={loading}
                  className="flex-1 border border-gold/40 text-gold py-3 rounded-xl text-sm hover:bg-gold/10 disabled:opacity-50"
                >
                  Save as Draft
                </button>
                <button
                  onClick={() => handleSubmit(false)}
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