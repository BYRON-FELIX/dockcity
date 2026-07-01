import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Home, AlertTriangle,
  CheckCircle, XCircle, Shield, TrendingUp,
  Clock, DollarSign, Eye, ChevronRight, Star, CreditCard, Calendar
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'hosts', label: 'Host Applications', icon: Users },
  { id: 'listings', label: 'Listings', icon: Home },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'payouts', label: 'Payouts', icon: DollarSign },
  { id: 'refunds', label: 'Refunds Needed', icon: AlertTriangle },
  { id: 'sale_listings', label: 'Sale Listings', icon: Home },
  { id: 'viewings', label: 'Viewings', icon: Calendar },
  { id: 'reviews', label: 'Reviews', icon: Star },
  { id: 'users', label: 'Users', icon: Shield },
]

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState({ dashboard: null, hosts: [], listings: [], disputes: [], users: [] })

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) navigate('/')
  }, [user, authLoading])

  useEffect(() => {
    if (user?.role === 'admin') fetchSummary()
  }, [user])

  const fetchSummary = async () => {
    setLoading(true)
    try {
      const [dashRes] = await Promise.all([api.get('/admin/dashboard/').catch(() => ({ data: null }))])
      setData(prev => ({ ...prev, dashboard: dashRes.data }))
    } catch (err) {
      toast.error('Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">
      <div className="w-64 bg-[#111111] border-r border-white/8 flex flex-col shrink-0 p-4">
        <div className="mb-4">
          <img src="https://res.cloudinary.com/dzczkq1nl/image/upload/t_cropped/ChatGPT_Image_Jun_30_2026_09_33_13_PM_oezlij.png" alt="logo" className="h-8 mb-1" />
          <p className="text-white/30 text-xs">Admin Panel</p>
        </div>

        <nav className="flex-1 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                activeTab === id ? 'bg-gold text-dark font-semibold' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </nav>

        <div className="pt-4">
          <button onClick={() => navigate('/')} className="w-full text-xs text-white/30 hover:text-white text-left">← Back to site</button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        {activeTab === 'dashboard' && (
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Dashboard</h1>
            <p className="text-white/40 text-sm mb-6">Platform overview</p>
            <div className="bg-[#111111] border border-white/8 rounded-xl p-6 text-white/40">Dashboard summary coming soon.</div>
          </div>
        )}

        {activeTab === 'payments' && (
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Recent Payments</h1>
            <p className="text-white/40 text-sm mb-6">Latest bookings where payment has been received.</p>
            <RecentPaymentsTab />
          </div>
        )}

        {activeTab === 'refunds' && (
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Refunds Needed</h1>
            <p className="text-white/40 text-sm mb-6">Guests whose bookings were declined and are waiting on a refund</p>
            <RefundsTab />
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Reviews</h1>
            <p className="text-white/40 text-sm mb-6">Moderate guest and host reviews. Deleting is permanent.</p>
            <ReviewsModerationTab />
          </div>
        )}

        {activeTab === 'sale_listings' && (
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Properties for Sale</h1>
            <p className="text-white/40 text-sm mb-6">Review and approve sale listing submissions</p>
            <SaleListingsTab />
          </div>
        )}

        {activeTab === 'viewings' && (
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Viewing Requests</h1>
            <p className="text-white/40 text-sm mb-6">Coordinate property viewings between buyers and sellers</p>
            <ViewingsTab />
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <h1 className="text-white text-2xl font-bold mb-2">Users</h1>
            <div className="bg-[#111111] border border-white/8 rounded-xl p-6 text-center text-white/30">User management via Django Admin</div>
          </div>
        )}
      </div>
    </div>
  )
}

function RefundsTab() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/bookings/declined/')
      .then(res => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleMarkRefundSent = async (bookingId) => {
    try {
      await api.post(`/bookings/${bookingId}/mark-refund-sent/`)
      toast.success('Refund marked as sent!')
      setBookings(prev => prev.filter(b => b.id !== bookingId))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark refund.')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (bookings.length === 0) return (
    <div className="text-center py-24 text-white/20">
      <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
      <p>No pending refunds — all caught up</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {bookings.map(booking => (
        <div key={booking.id} className="bg-[#111111] border border-red-500/20 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="text-white font-semibold">{booking.listing_title}</h3>
              <p className="text-white/40 text-sm">Guest: {booking.guest_name} · Ref: {booking.reference_code}</p>
              <p className="text-white/40 text-xs mt-2">Reason: {booking.cancellation_reason}</p>
              <p className="text-gold font-bold mt-2">KES {booking.total_amount_kes?.toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleMarkRefundSent(booking.id)} className="bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-lg">Mark Refund Sent</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentPaymentsTab() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/bookings/recent-payments/')
      .then(res => setPayments(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (payments.length === 0) return (
    <div className="text-center py-24 text-white/20">
      <CheckCircle size={40} className="mx-auto mb-3 opacity-30" />
      <p>No recent payments found.</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {payments.map(payment => (
        <div key={payment.id} className="bg-[#111111] border border-white/10 rounded-xl p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h3 className="text-white font-semibold">{payment.listing_title}</h3>
              <p className="text-white/40 text-sm">Guest: {payment.guest_name} · Ref: {payment.reference_code}</p>
              <p className="text-white/40 text-xs mt-2">Status: {payment.status.replace('_', ' ')}</p>
            </div>
            <div className="text-right">
              <p className="text-gold font-bold">KES {payment.total_amount_kes?.toLocaleString()}</p>
              <p className="text-white/40 text-xs">{payment.check_in_date} → {payment.check_out_date}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function ReviewsModerationTab() {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/reviews/all/')
      .then(res => setReviews(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleDelete = async (reviewId) => {
    if (!window.confirm('Delete this review permanently? This cannot be undone.')) return
    try {
      await api.delete(`/admin/reviews/${reviewId}/`)
      toast.success('Review deleted.')
      setReviews(prev => prev.filter(r => r.id !== reviewId))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to delete review.')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (reviews.length === 0) return (
    <div className="text-center py-24 text-white/20">
      <Star size={40} className="mx-auto mb-3 opacity-30" />
      <p>No reviews yet</p>
    </div>
  )

  return (
    <div className="space-y-4">
      {reviews.map(review => (
        <div key={review.id} className="bg-[#111111] border border-white/8 rounded-xl p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                {[1,2,3,4,5].map(s => (
                  <Star key={s} size={14} className={s <= review.rating ? 'text-gold' : 'text-white/20'} />
                ))}
                <span className="text-white/30 text-xs ml-2">{review.reviewer_name} → {review.reviewee_name}</span>
              </div>
              <p className="text-white/70 text-sm">{review.comment}</p>
              {review.host_reply && (
                <div className="mt-2 pl-3 border-l-2 border-gold/30">
                  <p className="text-white/40 text-xs mb-0.5">Host reply</p>
                  <p className="text-white/60 text-sm">{review.host_reply}</p>
                </div>
              )}
            </div>
            <button onClick={() => handleDelete(review.id)} className="flex items-center gap-1 border border-red-400/30 text-red-400 text-xs px-3 py-2 rounded-lg hover:bg-red-400/10"> 
              <XCircle size={13} /> Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function SaleListingsTab() {
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    api.get('/admin/properties-for-sale/')
      .then(res => setProperties(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleApprove = async (id) => {
    try {
      await api.post(`/admin/properties-for-sale/${id}/approve/`)
      toast.success('Property approved and now live!')
      setProperties(prev => prev.map(p => p.id === id ? { ...p, status: 'live' } : p))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve.')
    }
  }

  const handleReject = async () => {
    if (!rejectReason) return toast.error('Please provide a reason.')
    try {
      await api.post(`/admin/properties-for-sale/${rejectModal}/reject/`, { reason: rejectReason })
      toast.success('Property rejected.')
      setProperties(prev => prev.map(p => p.id === rejectModal ? { ...p, status: 'suspended' } : p))
      setRejectModal(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject.')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="space-y-4">
        {properties.length === 0 ? (
          <div className="text-center py-24 text-white/20">
            <Home size={40} className="mx-auto mb-3 opacity-30" />
            <p>No sale listings yet</p>
          </div>
        ) : properties.map(prop => (
          <div key={prop.id} className="bg-[#111111] border border-white/8 rounded-xl p-5 flex gap-4">
            {prop.photos?.[0] && (
              <img src={prop.photos[0]} alt="" className="w-24 h-20 object-cover rounded-lg shrink-0" />
            )}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-white font-semibold">{prop.title}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                  prop.status === 'live' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                  prop.status === 'pending_review' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                  'text-red-400 bg-red-400/10 border-red-400/20'
                }`}>
                  {prop.status.replace('_', ' ')}
                </span>
              </div>
              <p className="text-white/40 text-xs mb-1">{prop.neighborhood} · {prop.seller_name}</p>
              <p className="text-gold font-bold">KES {prop.sale_price_kes?.toLocaleString()}</p>
            </div>
            {prop.status === 'pending_review' && (
              <div className="flex gap-2 shrink-0 items-start">
                <button
                  onClick={() => handleApprove(prop.id)}
                  className="flex items-center gap-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-3 py-2 rounded-lg hover:bg-green-500/20"
                >
                  <CheckCircle size={13} />
                  Approve
                </button>
                <button
                  onClick={() => setRejectModal(prop.id)}
                  className="flex items-center gap-1 border border-red-400/30 text-red-400 text-xs px-3 py-2 rounded-lg hover:bg-red-400/10"
                >
                  <XCircle size={13} />
                  Reject
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {rejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Reject Listing</h3>
            <p className="text-white/40 text-sm mb-4">Provide a reason - the seller will be notified.</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold resize-none mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setRejectModal(null)} className="flex-1 border border-white/10 text-white/50 py-2 rounded-lg text-sm">Cancel</button>
              <button onClick={handleReject} className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-lg text-sm hover:bg-red-600">Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ViewingsTab() {
  const [viewings, setViewings] = useState([])
  const [loading, setLoading] = useState(true)
  const [notesModal, setNotesModal] = useState(null)
  const [notes, setNotes] = useState('')
  const [pendingStatus, setPendingStatus] = useState('')

  useEffect(() => {
    api.get('/admin/viewings/')
      .then(res => setViewings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleUpdate = async (id, newStatus, adminNotes = '') => {
    try {
      await api.patch(`/admin/viewings/${id}/`, { status: newStatus, admin_notes: adminNotes })
      toast.success(`Viewing ${newStatus}!`)
      setViewings(prev => prev.map(v => v.id === id ? { ...v, status: newStatus, admin_notes: adminNotes || v.admin_notes } : v))
      setNotesModal(null)
      setNotes('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to update.')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      <div className="space-y-4">
        {viewings.length === 0 ? (
          <div className="text-center py-24 text-white/20">
            <Calendar size={40} className="mx-auto mb-3 opacity-30" />
            <p>No viewing requests yet</p>
          </div>
        ) : viewings.map(viewing => (
          <div key={viewing.id} className="bg-[#111111] border border-white/8 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-white font-semibold text-sm">{viewing.property_title}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    viewing.status === 'confirmed' ? 'text-green-400 bg-green-400/10 border-green-400/20' :
                    viewing.status === 'pending' ? 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20' :
                    viewing.status === 'completed' ? 'text-white/50 bg-white/5 border-white/10' :
                    'text-red-400 bg-red-400/10 border-red-400/20'
                  }`}>
                    {viewing.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs text-white/40">
                  <span>Buyer: {viewing.buyer_name}</span>
                  <span>Email: {viewing.buyer_email}</span>
                  <span>Phone: {viewing.buyer_phone}</span>
                  <span>Date: {viewing.preferred_date}</span>
                </div>
                {viewing.message && (
                  <p className="text-white/40 text-xs mt-2 italic">"{viewing.message}"</p>
                )}
                {viewing.admin_notes && (
                  <p className="text-gold/60 text-xs mt-1">Notes: {viewing.admin_notes}</p>
                )}
              </div>

              {viewing.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => { setNotesModal(viewing.id); setPendingStatus('confirmed') }}
                    className="flex items-center gap-1 bg-green-500/10 border border-green-500/30 text-green-400 text-xs px-3 py-2 rounded-lg hover:bg-green-500/20"
                  >
                    <CheckCircle size={13} />
                    Confirm
                  </button>
                  <button
                    onClick={() => { setNotesModal(viewing.id); setPendingStatus('declined') }}
                    className="flex items-center gap-1 border border-red-400/30 text-red-400 text-xs px-3 py-2 rounded-lg hover:bg-red-400/10"
                  >
                    <XCircle size={13} />
                    Decline
                  </button>
                </div>
              )}
              {viewing.status === 'confirmed' && (
                <button
                  onClick={() => handleUpdate(viewing.id, 'completed')}
                  className="flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-xs px-3 py-2 rounded-lg hover:bg-gold/20 shrink-0"
                >
                  Mark Completed
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {notesModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1 capitalize">{pendingStatus} Viewing</h3>
            <p className="text-white/40 text-sm mb-4">Add notes for the buyer (optional) - they'll be included in the email.</p>
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={pendingStatus === 'confirmed' ? 'e.g. Meet at the gate at 2pm, call caretaker on arrival...' : 'e.g. Property is currently occupied, please check back next week...'}
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold resize-none mb-4"
            />
            <div className="flex gap-2">
              <button onClick={() => setNotesModal(null)} className="flex-1 border border-white/10 text-white/50 py-2 rounded-lg text-sm">Cancel</button>
              <button
                onClick={() => handleUpdate(notesModal, pendingStatus, notes)}
                className={`flex-1 font-semibold py-2 rounded-lg text-sm ${
                  pendingStatus === 'confirmed' ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-red-500 text-white hover:bg-red-600'
                }`}
              >
                {pendingStatus === 'confirmed' ? 'Confirm Viewing' : 'Decline Viewing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
