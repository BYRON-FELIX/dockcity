import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign, Calendar, Star, Clock,
  CheckCircle, XCircle, Plus, Edit, AlertTriangle
} from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'
import DatePicker from 'react-datepicker'
import 'react-datepicker/dist/react-datepicker.css'



const STATUS_STYLES = {
  pending_payment: { label: 'Pending Payment', color: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' },
  awaiting_host: { label: 'Awaiting Response', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' },
  confirmed: { label: 'Confirmed', color: 'text-green-400 bg-green-400/10 border-green-400/20' },
  checked_in: { label: 'Checked In', color: 'text-gold bg-gold/10 border-gold/20' },
  completed: { label: 'Completed', color: 'text-white/50 bg-white/5 border-white/10' },
  cancelled: { label: 'Cancelled', color: 'text-red-400 bg-red-400/10 border-red-400/20' },
  disputed: { label: 'Disputed', color: 'text-orange-400 bg-orange-400/10 border-orange-400/20' },
}

const LISTING_STATUS_STYLES = {
  draft: 'text-white/40 bg-white/5 border-white/10',
  pending_review: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  live: 'text-green-400 bg-green-400/10 border-green-400/20',
  suspended: 'text-red-400 bg-red-400/10 border-red-400/20',
}

export default function HostDashboard() {
  const { user, loading: authLoading, updateProfile } = useAuth()
  const navigate = useNavigate()

  const [bookings, setBookings] = useState([])
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('bookings')
  const [declineModal, setDeclineModal] = useState(null)
  const [declineReason, setDeclineReason] = useState('')
  const [countdown, setCountdown] = useState({})
  const [blockModal, setBlockModal] = useState(null) // listing id
  const [selectedDates, setSelectedDates] = useState([])
  const [blockLoading, setBlockLoading] = useState(false)
  const [reviewModal, setReviewModal] = useState(null)
  const [review, setReview] = useState({ rating: 5, comment: '' })
  const [hostReviews, setHostReviews] = useState([])
  const [replyDrafts, setReplyDrafts] = useState({})
  useEffect(() => {
    api.get('/auth/me/').then(res => {
      updateProfile(res.data)
    }).catch(() => {})
 }, [])
  
  
  useEffect(() => {
    if (!authLoading && !user) navigate('/')
    if (!authLoading && user?.role !== 'host') navigate('/')
  }, [user, authLoading])

  useEffect(() => {
    Promise.all([
      api.get('/bookings/host/me/'),
      api.get('/host/listings/'),
    ]).then(([bookingsRes, listingsRes]) => {
      setBookings(bookingsRes.data)
      setListings(listingsRes.data)
    }).catch(() => toast.error('Failed to load dashboard.'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (activeTab === 'reviews') {
      api.get('/reviews/host/me/')
        .then(res => setHostReviews(res.data))
        .catch(() => toast.error('Failed to load reviews.'))
    }
  }, [activeTab])

  // Countdown timer for awaiting_host bookings
  useEffect(() => {
    const interval = setInterval(() => {
      const newCountdown = {}
      bookings.forEach(b => {
        if (b.status === 'awaiting_host' && b.created_at) {
          const deadline = new Date(b.created_at).getTime() + 2 * 60 * 60 * 1000
          const remaining = deadline - Date.now()
          if (remaining > 0) {
            const mins = Math.floor(remaining / 60000)
            const secs = Math.floor((remaining % 60000) / 1000)
            newCountdown[b.id] = { mins, secs, urgent: mins < 30 }
          } else {
            newCountdown[b.id] = { expired: true }
          }
        }
      })
      setCountdown(newCountdown)
    }, 1000)
    return () => clearInterval(interval)
  }, [bookings])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const [bookingsRes, listingsRes] = await Promise.all([
          api.get('/bookings/host/me/'),
          api.get('/host/listings/'),
        ])
        setBookings(bookingsRes.data)
        setListings(listingsRes.data)
      } catch {}
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const handleConfirm = async (bookingId) => {
    try {
      await api.post(`/bookings/${bookingId}/confirm/`)
      toast.success('Booking confirmed!')
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, status: 'confirmed' } : b
      ))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to confirm.')
    }
  }

  const handleDecline = async () => {
    if (!declineReason) return toast.error('Please provide a reason.')
    try {
      await api.post(`/bookings/${declineModal}/decline/`, { reason: declineReason })
      toast.success('Booking declined. Guest will be refunded.')
      setDeclineModal(null)
      setDeclineReason('')
      setBookings(prev => prev.map(b =>
        b.id === declineModal ? { ...b, status: 'cancelled' } : b
      ))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to decline.')
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
    setReview({ rating: 5, comment: '' })
  } catch (err) {
    toast.error(err.response?.data?.error || 'Failed to submit review.')
  }
}

  const handleSubmitReply = async (reviewId) => {
  const reply = replyDrafts[reviewId]
  if (!reply?.trim()) return toast.error('Write a reply first.')
  try {
    await api.post(`/reviews/${reviewId}/reply/`, { reply })
    toast.success('Reply posted!')
    setHostReviews(prev => prev.map(r =>
      r.id === reviewId ? { ...r, host_reply: reply } : r
    ))
    setReplyDrafts(prev => ({ ...prev, [reviewId]: '' }))
  } catch (err) {
    toast.error(err.response?.data?.error || 'Failed to post reply.')
  }
}

  // Stats
  const totalEarnings = bookings
    .filter(b => b.status === 'completed')
    .reduce((sum, b) => sum + b.host_payout_kes, 0)

  const thisMonthBookings = bookings.filter(b => {
    const d = new Date(b.created_at)
    const now = new Date()
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  const pendingPayouts = bookings
    .filter(b => ['completed', 'checked_in'].includes(b.status) && !b.payout_sent_at)
    .reduce((sum, b) => sum + b.host_payout_kes, 0)

  const awaitingResponse = bookings.filter(b => b.status === 'awaiting_host')

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 pt-24 pb-16">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-2xl font-bold">Host Dashboard</h1>
            <p className="text-white/40 text-sm mt-1">Welcome back, {user?.full_name}</p>
          </div>
          <button
            onClick={() => navigate('/host/listings/new')}
            className="flex items-center gap-2 bg-gold text-dark font-bold px-4 py-2 rounded-lg hover:bg-gold/90 text-sm"
          >
            <Plus size={16} />
            New Listing
          </button>
        </div>

        {/* Host not approved banner */}
        {user?.host_profile_status !== 'approved' && (
          <div className="bg-yellow-400/10 border border-yellow-400/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle size={20} className="text-yellow-400 shrink-0" />
            <div>
              <p className="text-yellow-400 text-sm font-semibold">Application Pending</p>
              <p className="text-yellow-400/70 text-xs mt-0.5">
                Your host application is under review. You'll be notified once approved.
              </p>
            </div>
          </div>
        )}

        {/* Urgent bookings alert */}
        {awaitingResponse.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
            <Clock size={20} className="text-red-400 shrink-0" />
            <p className="text-red-400 text-sm font-semibold">
              You have {awaitingResponse.length} booking{awaitingResponse.length > 1 ? 's' : ''} awaiting your response!
              Respond within 2 hours or they will be auto-cancelled.
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total Earnings', value: `KES ${totalEarnings.toLocaleString()}`, icon: DollarSign },
            { label: 'Bookings This Month', value: thisMonthBookings, icon: Calendar },
            { label: 'Active Listings', value: listings.filter(l => l.status === 'live').length, icon: Star },
            { label: 'Pending Payouts', value: `KES ${pendingPayouts.toLocaleString()}`, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#111111] border border-white/8 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={16} className="text-gold" />
                <span className="text-white/40 text-xs">{label}</span>
              </div>
              <p className="text-gold text-xl font-bold">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-[#111111] rounded-xl p-1 mb-6 border border-white/8 w-fit">
          {['bookings', 'listings', 'reviews'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
                activeTab === tab ? 'bg-gold text-dark' : 'text-white/50 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Bookings tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-4">
            {bookings.length === 0 ? (
              <div className="text-center py-24 text-white/30">
                <Calendar size={40} className="mx-auto mb-3 opacity-30" />
                <p>No bookings yet</p>
              </div>
            ) : (
              bookings.map(booking => {
                const style = STATUS_STYLES[booking.status] || STATUS_STYLES.pending_payment
                const timer = countdown[booking.id]

                return (
                  <div key={booking.id} className="bg-[#111111] border border-white/8 rounded-xl p-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-white font-semibold">{booking.listing_title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${style.color}`}>
                            {style.label}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-4 text-sm text-white/40">
                          <span className="flex items-center gap-1">
                            Guest: <span className="text-white/70">{booking.guest_name}</span>
                            {booking.guest_rating_count > 0 ? (
                              <span className="flex items-center gap-0.5 text-white/50">
                                <Star size={11} className="text-gold" fill="currentColor" />
                                {booking.guest_average_rating} ({booking.guest_rating_count})
                              </span>
                            ) : (
                              <span className="text-white/20 text-xs">(new guest)</span>
                            )}
                          </span>
                          <span>{booking.check_in_date} → {booking.check_out_date}</span>
                          <span className="text-gold font-semibold">KES {booking.host_payout_kes?.toLocaleString()}</span>
                          <span className="text-white/30">Ref: {booking.reference_code}</span>
                        </div>

                        {booking.status === 'awaiting_host' && booking.guest_recent_host_reviews?.length > 0 && (
                          <div className="mt-3 bg-[#0A0A0A] border border-white/8 rounded-lg p-3">
                            <p className="text-white/50 text-xs mb-2">What other hosts said about this guest</p>
                            <div className="space-y-2">
                              {booking.guest_recent_host_reviews.map((r) => (
                                <div key={r.id} className="text-xs text-white/60 border-l-2 border-gold/30 pl-2">
                                  <div className="flex items-center gap-1 text-white/40 mb-1">
                                    <Star size={10} className="text-gold" fill="currentColor" />
                                    <span>{r.rating}/5 by {r.reviewer_name}</span>
                                  </div>
                                  <p className="text-white/70">{r.comment}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {booking.status === 'awaiting_host' && (
                          <>
                            {timer && !timer.expired && (
                              <span className={`text-xs font-mono px-2 py-1 rounded ${timer.urgent ? 'text-red-400 bg-red-400/10' : 'text-white/40 bg-white/5'}`}>
                                {String(timer.mins).padStart(2, '0')}:{String(timer.secs).padStart(2, '0')}
                              </span>
                            )}
                            {timer?.expired && (
                              <span className="text-xs text-red-400 bg-red-400/10 px-2 py-1 rounded">Expired</span>
                            )}
                            <button
                              onClick={() => handleConfirm(booking.id)}
                              className="flex items-center gap-1 bg-gold text-dark text-xs font-bold px-3 py-2 rounded-lg hover:bg-gold/90"
                            >
                              <CheckCircle size={13} />
                              Accept
                            </button>
                            <button
                              onClick={() => setDeclineModal(booking.id)}
                              className="flex items-center gap-1 border border-red-400/30 text-red-400 text-xs px-3 py-2 rounded-lg hover:bg-red-400/10"
                            >
                              <XCircle size={13} />
                              Decline
                            </button>

                          </>
                        )}
                        {booking.status === 'completed' && (
                          <button
                            onClick={() => setReviewModal(booking.id)}
                            className="flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-xs font-semibold px-3 py-2 rounded-lg hover:bg-gold/20 transition-colors"
                          >
                            <Star size={13} />
                            Review Guest
                          </button>
                        )}
                        {booking.status === 'completed' && (
                        <div className="mt-2">
                          {booking.payout_sent_at ? (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                              <CheckCircle size={11} />
                              Payout received
                            </span>
                          ) : (
                            <span className="text-xs text-yellow-400/70">
                              ⏳ Payout pending — admin will transfer shortly
                            </span>
                          )}
                        </div>
                      )}
                      </div>
                      {/* Payout status */}
                      {booking.status === 'completed' && (
                        <div className="mt-3 pt-3 border-t border-white/8">
                          {booking.payout_sent_at ? (
                            <div className="flex items-center gap-2 text-green-400 text-xs">
                              <CheckCircle size={13} />
                              <span>
                                Payout of <span className="font-bold">KES {booking.host_payout_kes?.toLocaleString()}</span> sent on {new Date(booking.payout_sent_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-yellow-400/70 text-xs">
                              <Clock size={13} />
                              <span>Payout of <span className="font-bold">KES {booking.host_payout_kes?.toLocaleString()}</span> pending — will be sent shortly</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        )}

        {/* Listings tab */}
        {activeTab === 'listings' && (
          <div className="space-y-4">
            {listings.length === 0 ? (
              <div className="text-center py-24 text-white/30">
                <Plus size={40} className="mx-auto mb-3 opacity-30" />
                <p>No listings yet</p>
                <button
                  onClick={() => navigate('/host/listings/new')}
                  className="mt-4 bg-gold text-dark font-bold px-6 py-2 rounded-lg text-sm"
                >
                  Create Your First Listing
                </button>
              </div>
            ) : (
              listings.map(listing => (
                <div key={listing.id} className="bg-[#111111] border border-white/8 rounded-xl p-5 flex items-center gap-4">
                  {/* Thumbnail */}
                  <div className="w-20 h-16 rounded-lg overflow-hidden bg-surface shrink-0">
                    {listing.photos?.[0] ? (
                      <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/10 text-xs">
                        No photo
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold text-sm">{listing.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${LISTING_STATUS_STYLES[listing.status]}`}>
                        {listing.status.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs">{listing.neighborhood} · KES {listing.price_per_night_kes?.toLocaleString()}/night</p>
                  </div>

                  <button
                    onClick={() => navigate(`/host/listings/${listing.id}/edit`)}
                    className="flex items-center gap-1 border border-white/10 text-white/50 text-xs px-3 py-2 rounded-lg hover:border-gold hover:text-gold transition-colors"
                  >
                    <Edit size={13} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setBlockModal(listing.id)
                      setSelectedDates([])
                    }}
                    className="flex items-center gap-1 border border-red-400/20 text-red-400/70 text-xs px-3 py-2 rounded-lg hover:bg-red-400/10 transition-colors"
                  >
                    Block Dates
                  </button>
                </div>
              ))

            )}
          </div>
      
        )}

        {/* Reviews tab */}
        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {hostReviews.length === 0 ? (
              <div className="text-center py-24 text-white/30">
                <Star size={40} className="mx-auto mb-3 opacity-30" />
                <p>No reviews yet</p>
              </div>
            ) : (
              hostReviews.map(review => (
                <div key={review.id} className="bg-[#111111] border border-white/8 rounded-xl p-5">
                  <div className="flex items-center gap-2 mb-2">
                    {[1,2,3,4,5].map(star => (
                      <Star
                        key={star}
                        size={14}
                        className={star <= review.rating ? 'text-gold' : 'text-white/20'}
                        fill={star <= review.rating ? 'currentColor' : 'none'}
                      />
                    ))}
                    <span className="text-white/30 text-xs ml-2">by {review.reviewer_name}</span>
                  </div>
                  <p className="text-white/70 text-sm mb-3">{review.comment}</p>

                  {review.host_reply ? (
                    <div className="pl-3 border-l-2 border-gold/30">
                      <p className="text-gold/70 text-xs mb-0.5">Your reply</p>
                      <p className="text-white/60 text-sm">{review.host_reply}</p>
                    </div>
                  ) : (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        value={replyDrafts[review.id] || ''}
                        onChange={e => setReplyDrafts(prev => ({ ...prev, [review.id]: e.target.value }))}
                        placeholder="Write a public reply..."
                        className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                      />
                      <button
                        onClick={() => handleSubmitReply(review.id)}
                        className="bg-gold text-dark text-xs font-bold px-4 py-2 rounded-lg hover:bg-gold/90 transition-colors shrink-0"
                      >
                        Reply
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

      {/* Block Dates Modal */}
       {blockModal && (
         <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Block Dates</h3>
            <p className="text-white/40 text-sm mb-4">
              Select dates to mark as unavailable. Guests won't be able to book these dates.
            </p>

            <div className="mb-4">
              <DatePicker
                selected={null}
                onChange={date => {
                 const dateStr = date.toISOString().split('T')[0]
                 setSelectedDates(prev =>
                   prev.includes(dateStr)
                    ? prev.filter(d => d !== dateStr)
                    : [...prev, dateStr]
                 )
            }}
            minDate={new Date()}
            highlightDates={selectedDates.map(d => new Date(d + 'T00:00:00'))}
            inline
            calendarClassName="thedockcity-calendar"
          />
        </div>

        {selectedDates.length > 0 && (
         <div className="mb-4 flex flex-wrap gap-2">
          {selectedDates.sort().map(d => (
            <span key={d} className="bg-red-400/10 border border-red-400/20 text-red-400 text-xs px-2 py-1 rounded-full">
              {new Date(d + 'T00:00:00').toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}
            </span>
          ))}
        </div>
      )}

      <p className="text-white/30 text-xs mb-4">
        {selectedDates.length} date(s) selected
      </p>

      <div className="flex gap-2">
        <button
          onClick={() => { setBlockModal(null); setSelectedDates([]) }}
          className="flex-1 border border-white/10 text-white/50 py-2 rounded-lg text-sm"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            if (!selectedDates.length) return toast.error('Select at least one date.')
            setBlockLoading(true)
            try {
              await api.post(`/host/listings/${blockModal}/block-dates/`, {
                dates: selectedDates,
                action: 'block'
              })
              toast.success(`${selectedDates.length} date(s) blocked successfully!`)
              setBlockModal(null)
              setSelectedDates([])
            } catch {
              toast.error('Failed to block dates.')
            } finally {
              setBlockLoading(false)
            }
          }}
          disabled={blockLoading || !selectedDates.length}
          className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-lg text-sm hover:bg-red-600 disabled:opacity-50"
        >
          {blockLoading ? 'Blocking...' : 'Block Selected Dates'}
        </button>
      </div>
    </div>
  </div>
)}
      </div>

      {/* Decline Modal */}
      {declineModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Decline Booking</h3>
            <p className="text-white/40 text-sm mb-4">Please provide a reason. The guest will be fully refunded.</p>
            <textarea
              rows={3}
              value={declineReason}
              onChange={e => setDeclineReason(e.target.value)}
              placeholder="Reason for declining..."
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setDeclineModal(null); setDeclineReason('') }}
                className="flex-1 border border-white/10 text-white/50 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDecline}
                className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-lg text-sm hover:bg-red-600"
              >
                Decline Booking
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Review Guest Modal */}
      {reviewModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Review Guest</h3>
            <p className="text-white/40 text-sm mb-4">Rate your experience with this guest.</p>

            <div className="mb-4">
              <label className="text-white/50 text-xs mb-2 block">Rating</label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReview((prev) => ({ ...prev, rating: star }))}
                    className="p-1"
                  >
                    <Star
                      size={20}
                      className={star <= review.rating ? 'text-gold' : 'text-white/20'}
                      fill={star <= review.rating ? 'currentColor' : 'none'}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="text-white/50 text-xs mb-1 block">Comment</label>
              <textarea
                rows={3}
                value={review.comment}
                onChange={(e) => setReview((prev) => ({ ...prev, comment: e.target.value }))}
                placeholder="How was your experience with this guest?"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold resize-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setReviewModal(null)
                  setReview({ rating: 5, comment: '' })
                }}
                className="flex-1 border border-white/10 text-white/50 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleReview}
                className="flex-1 bg-gold text-dark font-semibold py-2 rounded-lg text-sm hover:bg-gold/90"
              >
                Submit Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}