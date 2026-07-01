import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'
import PhotoUploader from '../components/PhotoUploader'
import MapPicker from '../components/MapPicker'
import { useNeighborhoods } from '../hooks/useNeighborhoods'
import { useAmenities } from '../hooks/useAmenities'

export default function EditListingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { id } = useParams()
  const { neighborhoods } = useNeighborhoods()
  const { amenities: amenityOptions } = useAmenities('listing')

  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [step, setStep] = useState(1)

  useEffect(() => {
    api.get(`/host/listings/${id}/`)
      .then(res => {
        const l = res.data
        setForm({
          title: l.title || '',
          description: l.description || '',
          neighborhood: l.neighborhood || '',
          city: l.city || 'Nairobi',
          full_address: l.full_address || '',
          area_description: l.area_description || '',
          latitude: l.latitude || null,
          longitude: l.longitude || null,
          caretaker_name: l.caretaker_name || '',
          caretaker_phone: l.caretaker_phone || '',
          price_per_night_kes: l.price_per_night_kes || '',
          price_per_week_kes: l.price_per_week_kes || '',
          price_per_month_kes: l.price_per_month_kes || '',
          max_guests: l.max_guests || 1,
          bedrooms: l.bedrooms || 1,
          bathrooms: l.bathrooms || 1,
          house_rules: l.house_rules || '',
          amenities: l.amenities || [],
          photos: l.photos || [],
          earliest_checkin_time: l.earliest_checkin_time || '14:00',
          latest_checkin_time: l.latest_checkin_time || '22:00',
          earliest_checkout_time: l.earliest_checkout_time || '08:00',
          latest_checkout_time: l.latest_checkout_time || '11:00',
          is_hourly_available: l.is_hourly_available || false,
          hourly_pricing_type: l.hourly_pricing_type || 'flat_rate',
          hourly_rate_kes: l.hourly_rate_kes || '',
          hourly_min_hours: l.hourly_min_hours || 2,
          hourly_blocks: l.hourly_blocks || [{ hours: 3, price_kes: '' }, { hours: 6, price_kes: '' }],
          long_stay_discounts: l.long_stay_discounts || [{ min_nights: 7, discount_percent: 10 }],
        })
      })
      .catch(() => {
        toast.error('Could not load this listing.')
        navigate('/dashboard/host')
      })
      .finally(() => setFetching(false))
  }, [id, navigate])

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
    if (!form.price_per_night_kes) {
      toast.error('Price per night is required.')
      return false
    }
    if (form.photos.length < 5) {
      toast.error('At least 5 photos are required.')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateStep1() || !validateStep2()) return
    setLoading(true)
    try {
      const cleanedHourlyBlocks = form.hourly_pricing_type === 'fixed_blocks'
        ? form.hourly_blocks
            .filter(b => b.hours && b.price_kes)
            .map(b => ({ hours: parseInt(b.hours), price_kes: parseInt(b.price_kes) }))
        : null

      const cleanedDiscounts = form.long_stay_discounts
        .filter(t => t.min_nights && t.discount_percent)
        .map(t => ({ min_nights: parseInt(t.min_nights), discount_percent: parseInt(t.discount_percent) }))

      await api.patch(`/host/listings/${id}/`, {
        ...form,
        latitude: form.latitude,
        longitude: form.longitude,
        hourly_rate_kes: form.hourly_rate_kes ? parseInt(form.hourly_rate_kes) : null,
        hourly_min_hours: form.hourly_min_hours ? parseInt(form.hourly_min_hours) : null,
        hourly_blocks: cleanedHourlyBlocks,
        long_stay_discounts: cleanedDiscounts,
        price_per_night_kes: parseInt(form.price_per_night_kes),
        price_per_week_kes: form.price_per_week_kes ? parseInt(form.price_per_week_kes) : null,
        price_per_month_kes: form.price_per_month_kes ? parseInt(form.price_per_month_kes) : null,
        max_guests: parseInt(form.max_guests),
        bedrooms: parseInt(form.bedrooms),
        bathrooms: parseInt(form.bathrooms),
      })
      toast.success('Listing updated successfully!')
      navigate('/dashboard/host')
    } catch (err) {
      const errors = err.response?.data
      if (typeof errors === 'object') {
        const first = Object.values(errors)[0]
        toast.error(Array.isArray(first) ? first[0] : first)
      } else {
        toast.error('Failed to update listing.')
      }
    } finally {
      setLoading(false)
    }
  }

  if (fetching || !form) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-16">

        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold">Edit Listing</h1>
          <p className="text-white/40 text-sm mt-1">
            Changes are applied immediately - no admin review needed.
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
                  <p className="text-green-400 text-xs mt-1">? Location pinned</p>
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

              <div>
                <label className="text-white/50 text-xs mb-2 block">Check-In Window</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/30 text-xs mb-1 block">Earliest</label>
                    <input
                      type="time"
                      value={form.earliest_checkin_time}
                      onChange={e => setForm({ ...form, earliest_checkin_time: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="text-white/30 text-xs mb-1 block">Latest</label>
                    <input
                      type="time"
                      value={form.latest_checkin_time}
                      onChange={e => setForm({ ...form, latest_checkin_time: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 block">Check-Out Window</label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-white/30 text-xs mb-1 block">Earliest</label>
                    <input
                      type="time"
                      value={form.earliest_checkout_time}
                      onChange={e => setForm({ ...form, earliest_checkout_time: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                    />
                  </div>
                  <div>
                    <label className="text-white/30 text-xs mb-1 block">Latest</label>
                    <input
                      type="time"
                      value={form.latest_checkout_time}
                      onChange={e => setForm({ ...form, latest_checkout_time: e.target.value })}
                      className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-white text-sm font-semibold">Allow Hourly Bookings</p>
                    <p className="text-white/30 text-xs mt-0.5">Let guests book this place by the hour, not just per night</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm({ ...form, is_hourly_available: !form.is_hourly_available })}
                    className={`w-12 h-6 rounded-full transition-colors relative shrink-0 ${
                      form.is_hourly_available ? 'bg-gold' : 'bg-white/10'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                      form.is_hourly_available ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {form.is_hourly_available && (
                  <div className="pt-3 border-t border-white/8 space-y-4">
                    <div className="flex gap-2">
                      {[
                        { value: 'flat_rate', label: 'Flat Rate per Hour' },
                        { value: 'fixed_blocks', label: 'Fixed Time Blocks' },
                      ].map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setForm({ ...form, hourly_pricing_type: opt.value })}
                          className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${
                            form.hourly_pricing_type === opt.value
                              ? 'bg-gold text-dark font-bold'
                              : 'bg-[#111111] text-white/50 border border-white/10'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {form.hourly_pricing_type === 'flat_rate' && (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-white/50 text-xs mb-1 block">Rate per Hour (KES)</label>
                          <input
                            type="number"
                            value={form.hourly_rate_kes}
                            onChange={e => setForm({ ...form, hourly_rate_kes: e.target.value })}
                            placeholder="e.g. 800"
                            className="w-full bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                          />
                        </div>
                        <div>
                          <label className="text-white/50 text-xs mb-1 block">Minimum Hours</label>
                          <input
                            type="number"
                            value={form.hourly_min_hours}
                            onChange={e => setForm({ ...form, hourly_min_hours: e.target.value })}
                            placeholder="e.g. 2"
                            className="w-full bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                          />
                        </div>
                      </div>
                    )}

                    {form.hourly_pricing_type === 'fixed_blocks' && (
                      <div className="space-y-2">
                        {form.hourly_blocks.map((block, i) => (
                          <div key={i} className="flex gap-2 items-center">
                            <div className="flex-1">
                              <input
                                type="number"
                                value={block.hours}
                                onChange={e => {
                                  const updated = [...form.hourly_blocks]
                                  updated[i].hours = parseInt(e.target.value) || 0
                                  setForm({ ...form, hourly_blocks: updated })
                                }}
                                placeholder="Hours"
                                className="w-full bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                              />
                            </div>
                            <span className="text-white/30 text-xs">hrs for KES</span>
                            <div className="flex-1">
                              <input
                                type="number"
                                value={block.price_kes}
                                onChange={e => {
                                  const updated = [...form.hourly_blocks]
                                  updated[i].price_kes = e.target.value
                                  setForm({ ...form, hourly_blocks: updated })
                                }}
                                placeholder="Price"
                                className="w-full bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                              />
                            </div>
                            {form.hourly_blocks.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setForm({ ...form, hourly_blocks: form.hourly_blocks.filter((_, idx) => idx !== i) })}
                                className="text-red-400 text-xs px-2"
                              >
                                x
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setForm({ ...form, hourly_blocks: [...form.hourly_blocks, { hours: '', price_kes: '' }] })}
                          className="text-gold text-xs font-semibold"
                        >
                          + Add another block
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-[#0A0A0A] border border-white/10 rounded-xl p-4">
                <p className="text-white text-sm font-semibold mb-1">Long-Stay Discounts</p>
                <p className="text-white/30 text-xs mb-3">Reward guests who book longer stays</p>

                <div className="space-y-2">
                  {form.long_stay_discounts.map((tier, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <span className="text-white/40 text-xs shrink-0">From</span>
                      <input
                        type="number"
                        value={tier.min_nights}
                        onChange={e => {
                          const updated = [...form.long_stay_discounts]
                          updated[i].min_nights = parseInt(e.target.value) || 0
                          setForm({ ...form, long_stay_discounts: updated })
                        }}
                        placeholder="Nights"
                        className="w-20 bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                      />
                      <span className="text-white/40 text-xs shrink-0">nights →</span>
                      <input
                        type="number"
                        value={tier.discount_percent}
                        onChange={e => {
                          const updated = [...form.long_stay_discounts]
                          updated[i].discount_percent = parseInt(e.target.value) || 0
                          setForm({ ...form, long_stay_discounts: updated })
                        }}
                        placeholder="%"
                        className="w-16 bg-[#111111] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                      />
                      <span className="text-white/40 text-xs shrink-0">% off</span>
                      {form.long_stay_discounts.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setForm({
                            ...form,
                            long_stay_discounts: form.long_stay_discounts.filter((_, idx) => idx !== i)
                          })}
                          className="text-red-400 text-xs px-2 ml-auto"
                        >
                          x
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setForm({
                    ...form,
                    long_stay_discounts: [...form.long_stay_discounts, { min_nights: '', discount_percent: '' }]
                  })}
                  className="text-gold text-xs font-semibold mt-3"
                >
                  + Add another tier
                </button>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-2 block">Amenities</label>
                <div className="flex flex-wrap gap-2">
                  {amenityOptions.map(amenity => (
                    <button
                      key={amenity}
                      type="button"
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
                Next - Pricing & Photos
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
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
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 border border-white/10 text-white/50 py-3 rounded-xl text-sm hover:border-white/30"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading}
                  className="flex-1 bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 disabled:opacity-50 flex items-center justify-center"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                  ) : 'Save Changes'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
