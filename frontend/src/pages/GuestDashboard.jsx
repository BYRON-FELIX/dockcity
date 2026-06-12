import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  MapPin, Calendar, Hash,
  AlertTriangle, Star, Clock, CheckCircle
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'
import { useBookingPolling } from '../hooks/useBookingPolling'

const STATUS_STYLES = {
  pending_payment: { label: 'Pending Payment', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  awaiting_host: { label: 'Awaiting Host', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  confirmed: { label: 'Confirmed', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  checked_in: { label: 'Checked In', color: 'text-gold bg-gold/10 border-gold/20' },
  completed: { label: 'Completed', color: 'text-white/50 bg-white/5 border-white/10' },
  cancelled: { label: 'Cancelled', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  disputed: { label: 'Disputed', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
}

const TABS = ['Upcoming', 'Active', 'Past', 'Cancelled']

export default function GuestDashboard() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Upcoming')
  const [reviewModal, setReviewModal] = useState(null)
  const [disputeModal, setDisputeModal] = useState(null)
  const [review, setReview] = useState({ rating: 5, comment: '' })
  const [dispute, setDispute] = useState({ reason: '' })
  const [receiptModal, setReceiptModal] = useState(null)
  const [receipt, setReceipt] = useState(null)

  useEffect(() => {
    if (!authLoading && !user) navigate('/')
  }, [user, authLoading])

  useEffect(() => {
    api.get('/bookings/guest/me/')
      .then(res => setBookings(res.data))
      .catch(() => toast.error('Failed to load bookings.'))
      .finally(() => setLoading(false))
  }, [])

  useBookingPolling((freshBookings) => {
    setBookings(freshBookings)
  })

  const filteredBookings = bookings.filter(b => {
    if (activeTab === 'Upcoming') return ['pending_payment', 'awaiting_host', 'confirmed'].includes(b.status)
    if (activeTab === 'Active') return ['checked_in', 'disputed'].includes(b.status)
    if (activeTab === 'Past') return b.status === 'completed'
    if (activeTab === 'Cancelled') return b.status === 'cancelled'
    return true
  })

  const handleCheckIn = async (bookingId) => {
    try {
      await api.post(`/bookings/${bookingId}/checkin/`)
      toast.success('Check-in confirmed! Escrow timer started.')
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, status: 'checked_in' } : b
      ))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Check-in failed.')
    }
  }

  const handleDispute = async () => {
    if (!dispute.reason) return toast.error('Please describe the issue.')
    try {
      await api.post(`/bookings/${disputeModal}/dispute/`, {
        booking_id: disputeModal,
        reason: dispute.reason,
        evidence_photo_urls: [],
      })
      toast.success('Dispute raised. Our team will review it.')
      setDisputeModal(null)
      setBookings(prev => prev.map(b =>
        b.id === disputeModal ? { ...b, status: 'disputed' } : b
      ))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to raise dispute.')
    }
  }

  const handleReview = async () => {
    if (!review.comment) return toast.error('Please write a comment.')
    try {
      await api.post('/reviews/', {
        booking_id: reviewModal,
        rating: review.rating,
        comment: review.comment,
      })
      toast.success('Review submitted!')
      setReviewModal(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit review.')
    }
  }

  const handleViewReceipt = async (bookingId) => {
    try {
      const res = await api.get(`/bookings/${bookingId}/receipt/`)
      setReceipt(res.data)
      setReceiptModal(bookingId)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not load receipt.')
    }
  }

  const isWithin24hrs = (checkedInAt) => {
    if (!checkedInAt) return false
    const hours = (new Date() - new Date(checkedInAt)) / (1000 * 60 * 60)
    return hours <= 24
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
          <h1 className="text-white text-2xl font-bold">My Trips</h1>
          <p className="text-white/40 text-sm mt-1">Welcome back, {user?.full_name}</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111111] rounded-xl p-1 mb-6 border border-white/8">
          {TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab ? 'bg-gold text-dark' : 'text-white/50 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Bookings */}
        {filteredBookings.length === 0 ? (
          <div className="text-center py-24 text-white/30">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
            <p>No {activeTab.toLowerCase()} trips</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredBookings.map(booking => {
              const style = STATUS_STYLES[booking.status] || STATUS_STYLES.pending_payment
              const photo = booking.listing_photo || null

              return (
                <div key={booking.id} className="bg-[#111111] border border-white/8 rounded-xl overflow-hidden">
                  <div className="flex flex-col md:flex-row">
                    {/* Photo */}
                    <div className="w-full md:w-48 h-36 md:h-auto bg-[#1A1A1A] shrink-0">
                      {photo ? (
                        <img src={photo} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">
                          No photo
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 p-5">
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <h3 className="text-white font-semibold">{booking.listing_title}</h3>
                          <div className="flex items-center gap-1 text-white/40 text-xs mt-1">
                            <MapPin size={11} />
                            {booking.listing_neighborhood}
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full border shrink-0 ${style.color}`}>
                          {style.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-4 text-sm text-white/50 mb-4">
                        <div className="flex items-center gap-1">
                          <Calendar size={13} />
                          {booking.check_in_date} → {booking.check_out_date}
                        </div>
                        <div className="flex items-center gap-1">
                          <Hash size={13} />
                          {booking.reference_code}
                        </div>
                        <div className="text-gold font-semibold">
                          KES {booking.total_amount_kes?.toLocaleString()}
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-wrap gap-2">
                        {/* Confirm check-in */}
                        {booking.status === 'confirmed' && (
                          <button
                            onClick={() => handleCheckIn(booking.id)}
                            className="flex items-center gap-1 bg-gold text-dark text-xs font-bold px-3 py-2 rounded-lg hover:bg-gold/90 transition-colors"
                          >
                            <CheckCircle size={13} />
                            Confirm Check-In
                          </button>
                        )}

                        {/* View Receipt */}
                        {['confirmed', 'checked_in', 'completed'].includes(booking.status) && (
                          <button
                            onClick={() => handleViewReceipt(booking.id)}
                            className="flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gold/20 transition-colors"
                          >
                            🧾 View Receipt
                          </button>
                        )}

                        {/* Raise dispute — 24hr window after check-in */}
                        {booking.status === 'checked_in' && isWithin24hrs(booking.checked_in_at) && (
                          <button
                            onClick={() => setDisputeModal(booking.id)}
                            className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                          >
                            <AlertTriangle size={13} />
                            Raise Dispute
                          </button>
                        )}

                        {/* Review prompt */}
                        {booking.status === 'completed' && (
                          <button
                            onClick={() => setReviewModal(booking.id)}
                            className="flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gold/20 transition-colors"
                          >
                            <Star size={13} />
                            Leave a Review
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Dispute Modal */}
      {disputeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Raise a Dispute</h3>
            <p className="text-white/40 text-sm mb-4">Describe the issue clearly. Our team will review within 24 hours.</p>
            <textarea
              rows={4}
              value={dispute.reason}
              onChange={e => setDispute({ reason: e.target.value })}
              placeholder="What went wrong?"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setDisputeModal(null)}
                className="flex-1 border border-white/10 text-white/50 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDispute}
                className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-lg text-sm hover:bg-red-600"
              >
                Submit Dispute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Leave a Review</h3>
            <p className="text-white/40 text-sm mb-4">Your review helps other guests and rewards great hosts.</p>
            <div className="flex gap-2 mb-4">
              {[1,2,3,4,5].map(star => (
                <button key={star} onClick={() => setReview({ ...review, rating: star })}>
                  <Star
                    size={24}
                    className={star <= review.rating ? 'text-gold' : 'text-white/20'}
                    fill={star <= review.rating ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
            </div>
            <textarea
              rows={4}
              value={review.comment}
              onChange={e => setReview({ ...review, comment: e.target.value })}
              placeholder="How was your stay?"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setReviewModal(null)}
                className="flex-1 border border-white/10 text-white/50 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                className="flex-1 bg-gold text-dark font-bold py-2 rounded-lg text-sm hover:bg-gold/90"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptModal && receipt && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4 overflow-y-auto py-8">
          <div className="bg-[#111111] border border-white/10 rounded-2xl w-full max-w-md">
            {/* Header */}
            <div className="bg-gold/10 border-b border-gold/20 p-6 text-center rounded-t-2xl">
              <div className="w-12 h-12 bg-gold rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-dark text-xl font-black">T</span>
              </div>
              <h3 className="text-white font-bold text-lg">Booking Confirmed!</h3>
              <p className="text-white/40 text-sm mt-1">The Dock City Booking Receipt</p>
              <div className="mt-3 bg-green-500/10 border border-green-500/20 rounded-lg px-4 py-2 inline-block">
                <p className="text-green-400 text-sm font-bold">{receipt.reference_code}</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Property */}
              <div className="bg-[#0A0A0A] border border-white/8 rounded-xl p-4">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Property</p>
                <p className="text-white font-semibold">{receipt.listing_title}</p>
                <p className="text-white/50 text-sm">{receipt.neighborhood}, Nairobi</p>
                {receipt.area_description && (
                  <p className="text-white/30 text-xs mt-1">{receipt.area_description}</p>
                )}
              </div>

              {/* Dates */}
              <div className="bg-[#0A0A0A] border border-white/8 rounded-xl p-4">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Stay Details</p>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/50">Check-in</span>
                  <span className="text-white font-medium">
                    {new Date(receipt.check_in_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/50">Check-out</span>
                  <span className="text-white font-medium">
                    {new Date(receipt.check_out_date).toLocaleDateString('en-KE', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Duration</span>
                  <span className="text-white font-medium">{receipt.total_nights} night{receipt.total_nights > 1 ? 's' : ''}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="bg-[#0A0A0A] border border-white/8 rounded-xl p-4">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Payment</p>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/50">Amount Paid</span>
                  <span className="text-gold font-bold text-base">KES {receipt.total_amount_kes?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/50">M-Pesa Code</span>
                  <span className="text-white font-mono font-medium">{receipt.mpesa_transaction_code || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/50">Paid From</span>
                  <span className="text-white">{receipt.payment_phone || 'N/A'}</span>
                </div>
              </div>

              {/* Location */}
              <div className="bg-[#0A0A0A] border border-white/8 rounded-xl p-4">
                <p className="text-white/40 text-xs uppercase tracking-wider mb-2">Location & Contact</p>
                <p className="text-white text-sm font-medium mb-1">{receipt.full_address}</p>
                {receipt.caretaker_name && (
                  <div className="mt-2 pt-2 border-t border-white/8">
                    <p className="text-white/40 text-xs mb-1">Caretaker / Contact Person</p>
                    <p className="text-white text-sm font-medium">{receipt.caretaker_name}</p>
                    <a
                      href={`tel:${receipt.caretaker_phone}`}
                      className="text-gold text-sm font-bold"
                    >
                      📞 {receipt.caretaker_phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Google Maps Button */}
              <a
                href={receipt.maps_link}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl transition-colors"
              >
                🗺️ Get Directions on Google Maps
              </a>

              <p className="text-white/20 text-xs text-center">
                Keep this receipt for your records. For support contact hello@thedockcity.com
              </p>

              <button
                onClick={() => { setReceiptModal(null); setReceipt(null) }}
                className="w-full border border-white/10 text-white/50 py-3 rounded-xl text-sm hover:border-white/30"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AddressReveal({ bookingId }) {
  const [address, setAddress] = useState(null)
  const [loading, setLoading] = useState(false)
  const [shown, setShown] = useState(false)

  const handleReveal = async () => {
    if (shown) { setShown(false); return }
    setLoading(true)
    try {
      const res = await api.get(`/bookings/${bookingId}/address/`)
      setAddress(res.data)
      setShown(true)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not load address.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button
        onClick={handleReveal}
        className="flex items-center gap-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold px-3 py-2 rounded-lg hover:bg-blue-500/20 transition-colors"
      >
        {loading ? (
          <div className="w-3 h-3 border border-blue-400 border-t-transparent rounded-full animate-spin" />
        ) : '📍'}
        {shown ? 'Hide Address' : 'View Address'}
      </button>

      {shown && address && (
        <div className="mt-2 bg-[#0A0A0A] border border-white/10 rounded-xl p-4 space-y-2">
          <div>
            <p className="text-white/40 text-xs mb-0.5">Full Address</p>
            <p className="text-white text-sm font-medium">{address.full_address}</p>
          </div>
          {address.caretaker_name && (
            <div>
              <p className="text-white/40 text-xs mb-0.5">Caretaker</p>
              <p className="text-white text-sm">{address.caretaker_name} · {address.caretaker_phone}</p>
            </div>
          )}
          <a
            href={address.maps_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-gold text-dark font-bold text-xs px-3 py-2 rounded-lg hover:bg-gold/90 transition-colors w-fit mt-2"
          >
            🗺️ Open in Google Maps
          </a>
        </div>
      )}
    </div>
  )
}