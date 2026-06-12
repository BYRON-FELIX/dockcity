import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Users, Home, AlertTriangle,
  CheckCircle, XCircle, Shield, TrendingUp,
  Clock, DollarSign, Eye, ChevronRight
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'hosts', label: 'Host Applications', icon: Users },
  { id: 'listings', label: 'Listings', icon: Home },
  { id: 'disputes', label: 'Disputes', icon: AlertTriangle },
  { id: 'payouts', label: 'Payouts', icon: DollarSign },
  { id: 'users', label: 'Users', icon: Shield },
]

export default function AdminPanel() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [data, setData] = useState({
    dashboard: null,
    hosts: [],
    listings: [],
    disputes: [],
    users: [],
  })
  const [payouts, setPayouts] = useState([])
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [resolveModal, setResolveModal] = useState(null)
  const [resolveForm, setResolveForm] = useState({
    resolution: 'resolved_for_guest',
    admin_notes: '',
    resolution_details: '',
  })

  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/')
    }
  }, [user, authLoading])

  useEffect(() => {
    if (user?.role === 'admin') fetchAll()
  }, [user])

  useEffect(() => {
    if (activeTab === 'payouts') fetchPayouts()
  }, [activeTab])

  const fetchPayouts = async () => {
    try {
      const res = await api.get('/bookings/host/me/')
      // Get all completed bookings across all hosts
      const res2 = await api.get('/admin/bookings/')
      setPayouts(res2.data)
    } catch {}
  }

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [dashRes, hostsRes, disputesRes, payoutsRes] = await Promise.all([
        api.get('/admin/dashboard/'),
        api.get('/admin/host-applications/'),
        api.get('/admin/disputes/'),
        api.get('/admin/payouts/'),
      ])
      setData(prev => ({
        ...prev,
        dashboard: dashRes.data,
        hosts: hostsRes.data,
        disputes: disputesRes.data,
      }))
    } catch {
      toast.error('Failed to load admin data.')
    } finally {
      setLoading(false)
    }
  }

  const handleApproveHost = async (id) => {
    try {
      await api.post(`/admin/host-applications/${id}/approve/`)
      toast.success('Host approved!')
      setData(prev => ({
        ...prev,
        hosts: prev.hosts.filter(h => h.id !== id)
      }))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve.')
    }
  }

  const handleRejectHost = async () => {
    if (!rejectReason) return toast.error('Rejection reason is required.')
    try {
      await api.post(`/admin/host-applications/${rejectModal}/reject/`, { reason: rejectReason })
      toast.success('Host application rejected.')
      setData(prev => ({
        ...prev,
        hosts: prev.hosts.filter(h => h.id !== rejectModal)
      }))
      setRejectModal(null)
      setRejectReason('')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to reject.')
    }
  }

  const handleApproveListing = async (id) => {
    try {
      await api.post(`/admin/listings/${id}/approve/`)
      toast.success('Listing approved and now live!')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to approve listing.')
    }
  }

  const handleSuspendListing = async (id) => {
    try {
      await api.post(`/admin/listings/${id}/suspend/`)
      toast.success('Listing suspended.')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to suspend.')
    }
  }

  const handleSuspendUser = async (id) => {
    try {
      await api.post(`/admin/users/${id}/suspend/`)
      toast.success('User suspended.')
      fetchAll()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to suspend user.')
    }
  }

  const handleResolveDispute = async () => {
    if (!resolveForm.admin_notes || !resolveForm.resolution_details) {
      return toast.error('Please fill in all fields.')
    }
    try {
      await api.post(`/admin/disputes/${resolveModal}/resolve/`, resolveForm)
      toast.success('Dispute resolved.')
      setData(prev => ({
        ...prev,
        disputes: prev.disputes.map(d =>
          d.id === resolveModal ? { ...d, status: resolveForm.resolution } : d
        )
      }))
      setResolveModal(null)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to resolve dispute.')
    }
  }

  // Fetch pending listings separately
  const fetchPendingListings = async () => {
    try {
      const res = await api.get('/listings/?status=pending_review')
      setData(prev => ({ ...prev, listings: res.data }))
    } catch {}
  }

  useEffect(() => {
    if (activeTab === 'listings') fetchPendingListings()
  }, [activeTab])

  if (authLoading || loading) return (
    <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const { dashboard } = data

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex">

      {/* Sidebar */}
      <div className="w-64 bg-[#111111] border-r border-white/8 flex flex-col shrink-0">
        {/* Logo */}
        <div>
          <img
            src="https://res.cloudinary.com/dzczkq1nl/image/upload/v1780476676/stayhaki_logo_davvxw.png"
            alt="The Dock City"
            className="h-8 w-auto object-contain mb-1"
          />
          <p className="text-white/30 text-xs">Admin Panel</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-colors ${
                activeTab === id
                  ? 'bg-gold text-dark font-semibold'
                  : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
              {id === 'hosts' && data.hosts.length > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {data.hosts.length}
                </span>
              )}
              {id === 'disputes' && data.disputes.filter(d => d.status === 'open').length > 0 && (
                <span className="ml-auto bg-orange-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {data.disputes.filter(d => d.status === 'open').length}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Admin info */}
        <div className="p-4 border-t border-white/8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-[#1A1A1A] rounded-full flex items-center justify-center text-gold text-sm font-bold">
              {user?.full_name?.[0]?.toUpperCase()}
            </div>
            <div>
              <p className="text-white text-xs font-medium">{user?.full_name}</p>
              <p className="text-white/30 text-xs">Administrator</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="mt-3 w-full text-xs text-white/30 hover:text-white transition-colors text-left"
          >
            ← Back to site
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">

          {/* ── Dashboard ── */}
          {activeTab === 'dashboard' && dashboard && (
            <div>
              <h1 className="text-white text-2xl font-bold mb-2">Dashboard</h1>
              <p className="text-white/40 text-sm mb-8">Platform overview</p>

              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Users', value: dashboard.users?.total, icon: Users, color: 'text-blue-400' },
                  { label: 'Active Listings', value: dashboard.listings?.live, icon: Home, color: 'text-green-400' },
                  { label: 'Total Bookings', value: dashboard.bookings?.total, icon: TrendingUp, color: 'text-purple-400' },
                  { label: 'Platform Revenue', value: `KES ${dashboard.platform_revenue_kes?.toLocaleString()}`, icon: DollarSign, color: 'text-gold' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div key={label} className="bg-[#111111] border border-white/8 rounded-xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon size={16} className={color} />
                      <span className="text-white/40 text-xs">{label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  </div>
                ))}
              </div>

              {/* Secondary stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Total Hosts', value: dashboard.users?.hosts },
                  { label: 'Total Guests', value: dashboard.users?.guests },
                  { label: 'Pending Listings', value: dashboard.listings?.pending_review },
                  { label: 'Open Disputes', value: dashboard.disputes?.open },
                  { label: 'Active Bookings', value: dashboard.bookings?.active },
                  { label: 'Pending Host Apps', value: dashboard.host_applications?.pending },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#111111] border border-white/8 rounded-xl p-4">
                    <p className="text-white/40 text-xs mb-1">{label}</p>
                    <p className="text-white text-xl font-bold">{value}</p>
                  </div>
                ))}
              </div>

              {/* Quick actions */}
              <h2 className="text-white font-semibold mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Review Host Applications', tab: 'hosts', count: dashboard.host_applications?.pending, color: 'border-blue-400/20 text-blue-400' },
                  { label: 'Approve Listings', tab: 'listings', count: dashboard.listings?.pending_review, color: 'border-green-400/20 text-green-400' },
                  { label: 'Resolve Disputes', tab: 'disputes', count: dashboard.disputes?.open, color: 'border-orange-400/20 text-orange-400' },
                  { label: 'Manage Users', tab: 'users', color: 'border-white/10 text-white/50' },
                ].map(({ label, tab, count, color }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`bg-[#111111] border rounded-xl p-4 text-left hover:bg-white/5 transition-colors ${color}`}
                  >
                    <p className="font-semibold text-sm mb-1">{label}</p>
                    {count !== undefined && (
                      <p className="text-xs opacity-60">{count} pending</p>
                    )}
                    <ChevronRight size={14} className="mt-2 opacity-50" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Host Applications ── */}
          {activeTab === 'hosts' && (
            <div>
              <h1 className="text-white text-2xl font-bold mb-2">Host Applications</h1>
              <p className="text-white/40 text-sm mb-6">
                {data.hosts.length} pending application{data.hosts.length !== 1 ? 's' : ''}
              </p>

              {data.hosts.length === 0 ? (
                <div className="text-center py-24 text-white/20">
                  <Users size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No pending host applications</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.hosts.map(host => (
                    <div key={host.id} className="bg-[#111111] border border-white/8 rounded-xl p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-[#1A1A1A] rounded-full flex items-center justify-center text-gold text-lg font-bold">
                            {host.user?.full_name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="text-white font-semibold">{host.user?.full_name}</p>
                            <p className="text-white/40 text-sm">{host.user?.email}</p>
                            <p className="text-white/30 text-xs mt-1">
                              Applied {new Date(host.user?.created_at).toLocaleDateString('en-KE', {
                                day: 'numeric', month: 'short', year: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>

                        <div className="flex gap-2 shrink-0">
                          <button
                            onClick={() => handleApproveHost(host.id)}
                            className="flex items-center gap-1 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-lg hover:bg-green-500/20 transition-colors font-semibold"
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => setRejectModal(host.id)}
                            className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg hover:bg-red-500/20 transition-colors"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      </div>

                      {/* Caretaker info */}
                      {(host.caretaker_name || host.caretaker_phone) && (
                        <div className="mt-4 pt-4 border-t border-white/8 flex gap-6 text-sm text-white/50">
                          <span>Caretaker: <span className="text-white/70">{host.caretaker_name}</span></span>
                          <span>Phone: <span className="text-white/70">{host.caretaker_phone}</span></span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Listings ── */}
          {activeTab === 'listings' && (
            <div>
              <h1 className="text-white text-2xl font-bold mb-2">Listings</h1>
              <p className="text-white/40 text-sm mb-6">Pending review listings</p>

              {data.listings.length === 0 ? (
                <div className="text-center py-24 text-white/20">
                  <Home size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No listings pending review</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.listings.map(listing => (
                    <div key={listing.id} className="bg-[#111111] border border-white/8 rounded-xl overflow-hidden">
                      <div className="flex gap-4 p-5">
                        {/* Photo */}
                        <div className="w-32 h-24 rounded-lg overflow-hidden shrink-0 bg-[#1A1A1A]">
                          {listing.photos?.[0] && (
                            <img src={listing.photos[0]} alt="" className="w-full h-full object-cover" />
                          )}
                        </div>

                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="text-white font-semibold">{listing.title}</h3>
                              <p className="text-white/40 text-sm mt-0.5">
                                {listing.neighborhood} · {listing.bedrooms} bed · {listing.bathrooms} bath · max {listing.max_guests} guests
                              </p>
                              <p className="text-gold text-sm font-semibold mt-1">
                                KES {listing.price_per_night_kes?.toLocaleString()} / night
                              </p>
                            </div>

                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleApproveListing(listing.id)}
                                className="flex items-center gap-1 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-lg hover:bg-green-500/20 font-semibold"
                              >
                                <CheckCircle size={14} />
                                Approve
                              </button>
                              <button
                                onClick={() => handleSuspendListing(listing.id)}
                                className="flex items-center gap-1 bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2 rounded-lg hover:bg-red-500/20"
                              >
                                <XCircle size={14} />
                                Reject
                              </button>
                            </div>
                          </div>

                          <p className="text-white/30 text-xs mt-2 line-clamp-2">{listing.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Disputes ── */}
          {activeTab === 'disputes' && (
            <div>
              <h1 className="text-white text-2xl font-bold mb-2">Disputes</h1>
              <p className="text-white/40 text-sm mb-6">{data.disputes.length} total disputes</p>

              {data.disputes.length === 0 ? (
                <div className="text-center py-24 text-white/20">
                  <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
                  <p>No disputes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.disputes.map(dispute => (
                    <div key={dispute.id} className="bg-[#111111] border border-white/8 rounded-xl p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full border ${
                              dispute.status === 'open'
                                ? 'text-orange-400 bg-orange-400/10 border-orange-400/20'
                                : dispute.status === 'under_review'
                                ? 'text-blue-400 bg-blue-400/10 border-blue-400/20'
                                : 'text-green-400 bg-green-400/10 border-green-400/20'
                            }`}>
                              {dispute.status.replace(/_/g, ' ')}
                            </span>
                            <span className="text-white/30 text-xs">
                              Booking: {dispute.booking_reference}
                            </span>
                          </div>
                          <p className="text-white font-medium text-sm mb-1">
                            Raised by: {dispute.raised_by_name}
                          </p>
                          <p className="text-white/50 text-sm leading-relaxed">{dispute.reason}</p>
                        </div>

                        {['open', 'under_review'].includes(dispute.status) && (
                          <button
                            onClick={() => {
                              setResolveModal(dispute.id)
                              setResolveForm({
                                resolution: 'resolved_for_guest',
                                admin_notes: '',
                                resolution_details: '',
                              })
                            }}
                            className="flex items-center gap-1 bg-gold/10 border border-gold/20 text-gold text-sm px-4 py-2 rounded-lg hover:bg-gold/20 shrink-0 font-semibold"
                          >
                            <Eye size={14} />
                            Resolve
                          </button>
                        )}
                      </div>

                      {dispute.resolution_details && (
                        <div className="mt-3 pt-3 border-t border-white/8">
                          <p className="text-white/40 text-xs mb-1">Resolution</p>
                          <p className="text-white/60 text-sm">{dispute.resolution_details}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Payouts ── */}
          {activeTab === 'payouts' && (
            <div>
              <h1 className="text-white text-2xl font-bold mb-2">Payouts</h1>
              <p className="text-white/40 text-sm mb-6">
                Manually mark host payouts as sent after transferring via M-Pesa
              </p>

              <PayoutsTab />
            </div>
          )}

          {/* ── Users ── */}
          {activeTab === 'users' && (
            <div>
              <h1 className="text-white text-2xl font-bold mb-2">Users</h1>
              <p className="text-white/40 text-sm mb-6">Manage platform users</p>

              <div className="bg-[#111111] border border-white/8 rounded-xl p-6 text-center text-white/30">
                <p className="mb-2">User management coming soon.</p>
                <p className="text-xs">Use Django Admin for now: <a href="http://127.0.0.1:8000/admin/users/user/" target="_blank" className="text-gold hover:underline">Open Django Admin</a></p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Reject Application</h3>
            <p className="text-white/40 text-sm mb-4">Provide a reason — this will be sent to the host.</p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection..."
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold resize-none mb-4"
            />
            <div className="flex gap-2">
              <button
                onClick={() => { setRejectModal(null); setRejectReason('') }}
                className="flex-1 border border-white/10 text-white/50 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectHost}
                className="flex-1 bg-red-500 text-white font-semibold py-2 rounded-lg text-sm hover:bg-red-600"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resolve Dispute Modal */}
      {resolveModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 px-4">
          <div className="bg-[#111111] border border-white/10 rounded-2xl p-6 w-full max-w-md">
            <h3 className="text-white font-bold text-lg mb-1">Resolve Dispute</h3>
            <p className="text-white/40 text-sm mb-4">Review the case and provide a resolution.</p>

            <div className="space-y-4">
              <div>
                <label className="text-white/50 text-xs mb-1 block">Resolution</label>
                <select
                  value={resolveForm.resolution}
                  onChange={e => setResolveForm({ ...resolveForm, resolution: e.target.value })}
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold"
                >
                  <option value="resolved_for_guest">Resolved for Guest</option>
                  <option value="resolved_for_host">Resolved for Host</option>
                  <option value="resolved_partial">Partial Resolution</option>
                </select>
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Admin Notes (internal)</label>
                <textarea
                  rows={2}
                  value={resolveForm.admin_notes}
                  onChange={e => setResolveForm({ ...resolveForm, admin_notes: e.target.value })}
                  placeholder="Internal notes..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold resize-none"
                />
              </div>
              <div>
                <label className="text-white/50 text-xs mb-1 block">Resolution Details (sent to both parties)</label>
                <textarea
                  rows={3}
                  value={resolveForm.resolution_details}
                  onChange={e => setResolveForm({ ...resolveForm, resolution_details: e.target.value })}
                  placeholder="Explain the resolution..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-gold resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setResolveModal(null)}
                className="flex-1 border border-white/10 text-white/50 py-2 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleResolveDispute}
                className="flex-1 bg-gold text-dark font-bold py-2 rounded-lg text-sm hover:bg-gold/90"
              >
                Submit Resolution
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  function PayoutsTab() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('completed')

  useEffect(() => {
    api.get(`/admin/bookings/?status=${filter}`)
      .then(res => setBookings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [filter])

  const handleMarkPayout = async (bookingId) => {
    try {
      await api.post(`/bookings/${bookingId}/mark-payout/`)
      toast.success('Payout marked as sent!')
      setBookings(prev => prev.map(b =>
        b.id === bookingId ? { ...b, payout_sent_at: new Date().toISOString() } : b
      ))
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to mark payout.')
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-gold border-t-transparent rounded-full animate-spin" />
    </div>
  )

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-2 mb-6">
        {['completed', 'checked_in', 'confirmed'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm transition-colors capitalize ${
              filter === s ? 'bg-gold text-dark font-semibold' : 'bg-[#111111] text-white/50 border border-white/8'
            }`}
          >
            {s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {bookings.length === 0 ? (
        <div className="text-center py-24 text-white/20">
          <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
          <p>No {filter.replace('_', ' ')} bookings</p>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map(booking => (
            <div key={booking.id} className="bg-[#111111] border border-white/8 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-white font-semibold">{booking.listing_title}</h3>
                    <span className={`text-xs px-2 py-1 rounded-full border ${
                      booking.payout_sent_at
                        ? 'text-green-400 bg-green-400/10 border-green-400/20'
                        : 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20'
                    }`}>
                      {booking.payout_sent_at ? 'Payout Sent' : 'Payout Pending'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm text-white/40 mb-2">
                    <span>Ref: <span className="text-white/70">{booking.reference_code}</span></span>
                    <span>Guest: <span className="text-white/70">{booking.guest_name}</span></span>
                    <span>{booking.check_in_date} → {booking.check_out_date}</span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div>
                      <p className="text-white/30 text-xs">Total Collected</p>
                      <p className="text-white font-semibold">KES {booking.total_amount_kes?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-white/30 text-xs">Platform Fee (10%)</p>
                      <p className="text-white font-semibold">KES {booking.platform_fee_kes?.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-white/30 text-xs">Host Payout</p>
                      <p className="text-gold font-bold text-lg">KES {booking.host_payout_kes?.toLocaleString()}</p>
                    </div>
                  </div>
                  {booking.payout_sent_at && (
                    <p className="text-green-400/60 text-xs mt-2">
                      Sent on {new Date(booking.payout_sent_at).toLocaleDateString('en-KE', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                      })}
                    </p>
                  )}
                </div>

                {!booking.payout_sent_at && booking.status === 'completed' && (
                  <button
                    onClick={() => handleMarkPayout(booking.id)}
                    className="flex items-center gap-2 bg-green-500/10 border border-green-500/30 text-green-400 text-sm px-4 py-2 rounded-lg hover:bg-green-500/20 font-semibold shrink-0"
                  >
                    <CheckCircle size={14} />
                    Mark Payout Sent
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
}
