import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  MapPin, Star, ShieldCheck, Users, Bed, Bath,
  Wifi, Car, Dumbbell, Wind, Tv, Shield, ChevronLeft, ChevronRight, Lock
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'

const AMENITY_ICONS = {
  'WiFi': Wifi, 'Parking': Car, 'Gym': Dumbbell,
  'Air Conditioning': Wind, 'DSTV': Tv, 'Security': Shield,
}

export default function ListingDetailPage() {
  const { user } = useAuth()

  const [listing, setListing] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [booking, setBooking] = useState({
    check_in_date: '', check_out_date: '', guests: 1
  })

  const [bookingLoading, setBookingLoading] = useState(false)
  const [unavailableDates, setUnavailableDates] = useState([])

  const [payModal, setPayModal] = useState(false)
  const [payPhone, setPayPhone] = useState(user?.phone_number || '')
  const [payLoading, setPayLoading] = useState(false)
  const { id } = useParams()
  const navigate = useNavigate()
  const [paymentStatus, setPaymentStatus] = useState(null) // null | 'waiting' | 'success' | 'failed'
  const [bookingRef, setBookingRef] = useState(null)
  

 

  useEffect(() => {
     Promise.all([
    api.get(`/listings/${id}/`),
    api.get(`/listings/${id}/reviews/`).catch(() => ({ data: [] })),
    api.get(`/listings/${id}/availability/`).catch(() => ({ data: { unavailable_dates: [] } }))
  ]).then(([listingRes, reviewsRes, availRes]) => {
    setListing(listingRes.data)
    setReviews(reviewsRes.data)
    // Convert date strings to Date objects
    const blocked = availRes.data.unavailable_dates.map(d => new Date(d + 'T00:00:00'))
    setUnavailableDates(blocked)
  }).catch(() => navigate('/browse'))
    .finally(() => setLoading(false))
}, [id])

  const totalNights = () => {
  if (!booking.check_in_date || !booking.check_out_date) return 0
  const diff = new Date(booking.check_out_date) - new Date(booking.check_in_date)
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

const nights = totalNights()
const subtotal = nights * (listing?.price_per_night_kes || 0)
const platformFee = Math.round(subtotal * 0.10)
const total = subtotal + platformFee

const handleBooking = async () => {
  if (!user) return toast.error('Please sign in to book.')
  if (!booking.check_in_date) return toast.error('Please select a check-in date.')
  if (!booking.check_out_date) return toast.error('Please select a check-out date.')
  if (nights < 1) return toast.error('Check-out must be after check-in.')
  if (booking.guests < 1) return toast.error('At least 1 guest required.')
  // Show phone modal
  setPayPhone(user?.phone_number || '')
  setPayModal(true)
 }

 const handleConfirmPayment = async () => {
  if (!payPhone) return toast.error('Phone number is required.')
  const phone = payPhone.replace(/\s/g, '')
  if (!/^(07|01|2547|2541|\+2547|\+2541)\d{7,8}$/.test(phone)) {
    return toast.error('Enter a valid Kenyan phone number e.g. 0712345678')
  }

  setPayLoading(true)
  try {
    const res = await api.post('/bookings/', {
      listing_id: id,
      check_in_date: booking.check_in_date?.toISOString().split('T')[0],
      check_out_date: booking.check_out_date?.toISOString().split('T')[0],
      guests: booking.guests,
      phone_number: phone,
    })
    setPayModal(false)
    toast.success('STK Push sent! Check your phone and enter your M-Pesa PIN.')
    navigate('/dashboard/guest')
  } catch (err) {
    toast.error(err.response?.data?.error || 'Booking failed. Try again.')
  } finally {
    setPayLoading(false)
  }
}

  if (loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (!listing) return null

  const photos = listing.photos || []

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 pt-24 pb-16">
        {/* Photo gallery */}
        <div className="relative rounded-2xl overflow-hidden mb-8 bg-[#0A0A0A]" style={{ aspectRatio: '16/9', maxHeight: '500px' }}>
          {photos.length > 0 ? (
            <>
              <img
                src={photos[photoIndex]}
                alt={listing.title}
                className="absolute inset-0 w-full h-full object-contain object-center"
              />
              {photos.length > 1 && (
                <>
                  <button
                    onClick={() => setPhotoIndex(i => (i - 1 + photos.length) % photos.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70"
                  >
                    <ChevronLeft size={20} className="text-white" />
                  </button>
                  <button
                    onClick={() => setPhotoIndex(i => (i + 1) % photos.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 p-2 rounded-full hover:bg-black/70"
                  >
                    <ChevronRight size={20} className="text-white" />
                  </button>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1">
                    {photos.map((_, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoIndex(i)}
                        className={`w-2 h-2 rounded-full transition-colors ${i === photoIndex ? 'bg-gold' : 'bg-white/40'}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-white/20">
              No photos available
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left — listing info */}
          <div className="lg:col-span-2">
            {/* Title + badges */}
            <div className="mb-4">
              <div className="flex items-center gap-2 mb-2">
                {listing.verification_badges?.map(badge => (
                  <span key={badge} className="flex items-center gap-1 bg-gold/10 text-gold text-xs px-2 py-1 rounded-full border border-gold/30">
                    <ShieldCheck size={11} />
                    {badge}
                  </span>
                ))}
              </div>
              <h1 className="text-white text-2xl md:text-3xl font-bold mb-2">{listing.title}</h1>
              <div className="flex items-center gap-4 text-sm text-white/50">
                <span className="flex items-center gap-1">
                  <MapPin size={14} />
                  {listing.neighborhood}, {listing.city}
                </span>
                {listing.average_rating > 0 && (
                  <span className="flex items-center gap-1 text-gold">
                    <Star size={14} fill="currentColor" />
                    {listing.average_rating} ({listing.total_reviews} reviews)
                  </span>
                )}
              </div>
            </div>

            {/* Host info */}
            <div className="bg-[#111111] border border-white/8 rounded-xl p-4 mb-6 flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1A1A1A] rounded-full flex items-center justify-center text-gold text-lg font-bold">
                🏠
              </div>
              <div>
                <p className="text-white font-semibold">Verified Host</p>
                <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-gold/10 text-gold border border-gold/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <ShieldCheck size={10} />
                    The Dock City Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mb-6 text-sm">
              <div className="flex items-center gap-2 text-white/60">
                <Bed size={16} className="text-gold" />
                {listing.bedrooms} Bedroom{listing.bedrooms !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Bath size={16} className="text-gold" />
                {listing.bathrooms} Bathroom{listing.bathrooms !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-2 text-white/60">
                <Users size={16} className="text-gold" />
                Up to {listing.max_guests} guests
              </div>
            </div>

            {/* Description */}
            <div className="mb-6">
              <h2 className="text-white font-semibold mb-2">About this space</h2>
              <p className="text-white/50 text-sm leading-relaxed">{listing.description}</p>
            </div>

            {/* Amenities */}
            {listing.amenities?.length > 0 && (
              <div className="mb-6">
                <h2 className="text-white font-semibold mb-3">Amenities</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {listing.amenities.map(amenity => {
                    const Icon = AMENITY_ICONS[amenity] || ShieldCheck
                    return (
                      <div key={amenity} className="flex items-center gap-2 text-white/60 text-sm">
                        <Icon size={16} className="text-gold" />
                        {amenity}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* House rules */}
            {listing.house_rules && (
              <div className="mb-6">
                <h2 className="text-white font-semibold mb-2">House Rules</h2>
                <p className="text-white/50 text-sm leading-relaxed">{listing.house_rules}</p>
              </div>
            )}

            {/* Reviews */}
            <div>
              <h2 className="text-white font-semibold mb-4">
                Reviews {reviews.length > 0 && <span className="text-white/40 font-normal">({reviews.length})</span>}
              </h2>
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="bg-[#111111] border border-white/8 rounded-xl p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-surface rounded-full flex items-center justify-center text-gold text-sm font-bold">
                            {review.reviewer_name?.[0]?.toUpperCase()}
                          </div>
                          <span className="text-white text-sm font-medium">{review.reviewer_name}</span>
                        </div>
                        <div className="flex items-center gap-1 text-gold text-sm">
                          {[...Array(review.rating)].map((_, i) => (
                            <Star key={i} size={12} fill="currentColor" />
                          ))}
                        </div>
                      </div>
                      <p className="text-white/50 text-sm">{review.comment}</p>
                      {review.host_reply && (
                        <div className="mt-3 pl-3 border-l-2 border-gold/30">
                          <p className="text-white/40 text-xs mb-1">Host reply:</p>
                          <p className="text-white/60 text-sm">{review.host_reply}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-white/30 text-sm">No reviews yet.</p>
              )}
            </div>
          </div>

          {/* Right — booking widget */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 bg-[#111111] border border-white/8 rounded-2xl p-6">
              <div className="mb-4">
                <span className="text-gold text-2xl font-bold">
                  KES {listing.price_per_night_kes?.toLocaleString()}
                </span>
                <span className="text-white/40 text-sm"> / night</span>
              </div>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-white/50 text-xs mb-1 block">Check-in</label>
              <DatePicker
                selected={booking.check_in_date}
                onChange={date => setBooking({ 
                  ...booking, 
                  check_in_date: date,
                  // Reset checkout if it's before new checkin
                  check_out_date: booking.check_out_date && date >= booking.check_out_date 
                    ? null 
                    : booking.check_out_date
                })}
                minDate={new Date()}
                excludeDates={unavailableDates}
                dateFormat="dd MMM yyyy"
                placeholderText="Select check-in date"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold cursor-pointer"
                calendarClassName="thedockcity-calendar"
                wrapperClassName="w-full"

                renderDayContents={(day, date) => {
                  const isBlocked = unavailableDates.some(
                    d => d.toDateString() === date.toDateString()
                  )
                  return (
                    <div
                      title={isBlocked ? 'Already booked' : ''}
                      className="relative group"
                    >
                      {day}
                      {isBlocked && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-red-400 text-xs px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-red-400/20">
                          Already booked
                        </span>
                      )}
                    </div>
                  )
          }}
              />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Check-out</label>
              <DatePicker
                selected={booking.check_out_date}
                onChange={date => setBooking({ ...booking, check_out_date: date })}
                minDate={booking.check_in_date 
                  ? new Date(booking.check_in_date.getTime() + 86400000) 
                  : new Date(new Date().getTime() + 86400000)
                }
                excludeDates={unavailableDates}
                dateFormat="dd MMM yyyy"
                placeholderText="Select check-out date"
                disabled={!booking.check_in_date}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                calendarClassName="thedockcity-calendar"
                wrapperClassName="w-full"

                renderDayContents={(day, date) => {
                  const isBlocked = unavailableDates.some(
                    d => d.toDateString() === date.toDateString()
                  )
                  return (
                    <div
                      title={isBlocked ? 'Already booked' : ''}
                      className="relative group"
                    >
                      {day}
                      {isBlocked && (
                        <span className="absolute -top-7 left-1/2 -translate-x-1/2 bg-black text-red-400 text-xs px-2 py-0.5 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 border border-red-400/20">
                          Already booked
                        </span>
                      )}
                    </div>
                  )
                }}
              />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">Guests</label>
              <select
                value={booking.guests}
                onChange={e => setBooking({ ...booking, guests: parseInt(e.target.value) })}
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
              >
                {[...Array(listing.max_guests)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1} Guest{i > 0 ? 's' : ''}</option>
                ))}
              </select>
            </div>
          </div>

             {/* Fee breakdown — platform cut hidden from users */}
             {nights > 0 && (
                <div className="border-t border-white/8 pt-4 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between text-white/50">
                    <span>KES {listing.price_per_night_kes?.toLocaleString()} × {nights} night{nights > 1 ? 's' : ''}</span>
                    <span>KES {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold border-t border-white/8 pt-2">
                    <span>Total</span>
                    <span className="text-gold">KES {subtotal.toLocaleString()}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleBooking}
                disabled={bookingLoading}
                className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Pay with M-Pesa
              </button>

              <div className="flex items-center gap-2 mt-3 text-white/30 text-xs justify-center">
                <Lock size={11} />
                Funds held safely until you confirm check-in
              </div>
              {/* M-Pesa Payment Modal */}
              {payModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
                  <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
                    <div className="text-center mb-6">
                      <div className="w-14 h-14 bg-green-500/10 border border-green-500/20 rounded-2xl flex items-center justify-center mx-auto mb-3">
                        <span className="text-2xl">📱</span>
                      </div>
                      <h3 className="text-white font-bold text-lg">Pay with M-Pesa</h3>
                      <p className="text-white/40 text-sm mt-1">
                        Enter your M-Pesa number to receive the payment prompt
                      </p>
                    </div>

                    <div className="bg-[#0A0A0A] border border-white/8 rounded-xl p-4 mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">{listing?.title}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-white/50">
                          {booking.check_in_date?.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                          {' → '}
                          {booking.check_out_date?.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
                        </span>
                        <span className="text-white/50">{nights} night{nights > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-white/8 pt-2">
                        <span className="text-white">Total</span>
                        <span className="text-gold">KES {subtotal.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="mb-4">
                      <label className="text-white/50 text-xs mb-1 block">M-Pesa Phone Number</label>
                      <div className="flex gap-2">
                        <div className="bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-3 text-white/50 text-sm shrink-0">
                          🇰🇪 +254
                        </div>
                        <input
                          type="tel"
                          value={payPhone}
                          onChange={e => setPayPhone(e.target.value)}
                          placeholder="0712 345 678"
                          className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-green-500"
                        />
                      </div>
                      <p className="text-white/30 text-xs mt-1">
                        You will receive an STK push prompt on this number
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => setPayModal(false)}
                        className="flex-1 border border-white/10 text-white/50 py-3 rounded-xl text-sm"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmPayment}
                        disabled={payLoading}
                        className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {payLoading ? (
                          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>📲 Send Payment Request</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Payment Status Screen */}
              {paymentStatus && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 px-4">
                  <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 w-full max-w-md text-center">

                    {/* Waiting */}
                    {paymentStatus === 'waiting' && (
                      <>
                        <div className="w-20 h-20 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin mx-auto mb-6" />
                        <h3 className="text-white font-bold text-xl mb-2">Waiting for Payment</h3>
                        <p className="text-white/50 text-sm mb-2">
                          Check your phone — an M-Pesa prompt has been sent to
                        </p>
                        <p className="text-gold font-bold text-lg mb-4">{payPhone}</p>
                        <div className="bg-[#0A0A0A] border border-white/8 rounded-xl p-4 text-left space-y-2 mb-6">
                          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Instructions</p>
                          <div className="flex items-start gap-2 text-sm text-white/60">
                            <span className="text-gold shrink-0">1.</span>
                            Open M-Pesa on your phone
                          </div>
                          <div className="flex items-start gap-2 text-sm text-white/60">
                            <span className="text-gold shrink-0">2.</span>
                            Enter your M-Pesa PIN when prompted
                          </div>
                          <div className="flex items-start gap-2 text-sm text-white/60">
                            <span className="text-gold shrink-0">3.</span>
                            Wait for confirmation — do not close this page
                          </div>
                        </div>
                        <p className="text-white/20 text-xs">
                          Booking ref: {bookingRef}
                        </p>
                        <button
                          onClick={() => { setPaymentStatus(null); navigate('/dashboard/guest') }}
                          className="mt-4 text-white/30 text-xs hover:text-white transition-colors"
                        >
                          I'll check my booking status later →
                        </button>
                      </>
                    )}

                    {/* Success */}
                    {paymentStatus === 'success' && (
                      <>
                        <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                          <span className="text-4xl">✅</span>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">Payment Confirmed!</h3>
                        <p className="text-white/50 text-sm mb-2">
                          Your booking is confirmed. The host has been notified.
                        </p>
                        <p className="text-gold font-semibold mb-6">Ref: {bookingRef}</p>
                        <button
                          onClick={() => { setPaymentStatus(null); navigate('/dashboard/guest') }}
                          className="w-full bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 transition-colors"
                        >
                          View My Booking
                        </button>
                      </>
                    )}

                    {/* Failed */}
                    {paymentStatus === 'failed' && (
                      <>
                        <div className="w-20 h-20 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                          <span className="text-4xl">❌</span>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">Payment Failed</h3>
                        <p className="text-white/50 text-sm mb-6">
                          The payment was not completed. Please try again.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPaymentStatus(null)}
                            className="flex-1 border border-white/10 text-white/50 py-3 rounded-xl text-sm"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={() => { setPaymentStatus(null); setPayModal(true) }}
                            className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-green-500"
                          >
                            Try Again
                          </button>
                        </div>
                      </>
                    )}

                    {/* Timeout */}
                    {paymentStatus === 'timeout' && (
                      <>
                        <div className="w-20 h-20 bg-yellow-500/10 border border-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                          <span className="text-4xl">⏱️</span>
                        </div>
                        <h3 className="text-white font-bold text-xl mb-2">Payment Timed Out</h3>
                        <p className="text-white/50 text-sm mb-6">
                          We couldn't confirm your payment. If you completed it, check your booking status in My Trips.
                        </p>
                        <div className="flex gap-2">
                          <button
                            onClick={() => { setPaymentStatus(null); navigate('/dashboard/guest') }}
                            className="flex-1 border border-white/10 text-white/50 py-3 rounded-xl text-sm"
                          >
                            Check My Trips
                          </button>
                          <button
                            onClick={() => { setPaymentStatus(null); setPayModal(true) }}
                            className="flex-1 bg-green-600 text-white font-bold py-3 rounded-xl text-sm hover:bg-green-500"
                          >
                            Try Again
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

            </div>

          </div>
        </div>
      </div>
    </div>
  )
}