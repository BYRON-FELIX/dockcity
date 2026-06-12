import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck, Home } from 'lucide-react'
import Navbar from '../components/Navbar'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function BecomeHostPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ caretaker_name: '', caretaker_phone: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.caretaker_name || !form.caretaker_phone) {
      return toast.error('Please fill in all fields.')
    }
    setLoading(true)
    try {
      await api.post('/auth/become-host/', form)
      toast.success('Application submitted! Await admin approval.')
      navigate('/')
      window.location.reload()
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to submit application.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-lg mx-auto px-4 pt-32 pb-16">
        <div className="bg-[#111111] border border-white/8 rounded-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-surface rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Home size={28} className="text-gold" />
            </div>
            <h1 className="text-white text-2xl font-bold mb-2">Become a Host</h1>
            <p className="text-white/40 text-sm">
              List your property on The Dock City. Your application will be reviewed by our team before you can go live.
            </p>
          </div>

          {/* What to expect */}
          <div className="bg-surface/30 border border-white/8 rounded-xl p-4 mb-6 space-y-2">
            {[
              'Your application is reviewed within 24 hours',
              'Start with 1 listing on probation',
              'Upgrade to Verified Host after 3 clean bookings',
              'Payouts via M-Pesa within 8 hours of check-in',
            ].map(item => (
              <div key={item} className="flex items-start gap-2 text-sm text-white/50">
                <ShieldCheck size={14} className="text-gold mt-0.5 shrink-0" />
                {item}
              </div>
            ))}
          </div>

          {/* Form */}
          <div className="space-y-4 mb-6">
            <div>
              <label className="text-white/50 text-xs mb-1 block">
                Caretaker / Property Manager Name
              </label>
              <input
                type="text"
                value={form.caretaker_name}
                onChange={e => setForm({ ...form, caretaker_name: e.target.value })}
                placeholder="Full name of caretaker"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <div>
              <label className="text-white/50 text-xs mb-1 block">
                Caretaker Phone Number
              </label>
              <input
                type="tel"
                value={form.caretaker_phone}
                onChange={e => setForm({ ...form, caretaker_phone: e.target.value })}
                placeholder="e.g. 0712 345 678"
                className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-dark border-t-transparent rounded-full animate-spin" />
            ) : (
              'Submit Host Application'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}