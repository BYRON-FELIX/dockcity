import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function CompleteProfileModal() {
  const { user, updateProfile } = useAuth()
  const [form, setForm] = useState({
    full_name: user?.full_name || '',
    phone_number: '',
  })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return toast.error('Full name is required.')
    if (!form.phone_number.trim()) return toast.error('Phone number is required.')

    // Normalize phone
    const phone = form.phone_number.replace(/\s/g, '')
    if (!/^(07|01|2547|2541|\+2547|\+2541)\d{7,8}$/.test(phone)) {
      return toast.error('Enter a valid Kenyan phone number e.g. 0712345678')
    }

    setLoading(true)
    try {
      const res = await api.patch('/auth/me/update/', {
        full_name: form.full_name.trim(),
        phone_number: phone,
      })
      
      updateProfile(res.data)
      toast.success('Profile saved!')
    } catch (err) {
      
      toast.error(err.response?.data?.error || 'Failed to save profile. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[999] px-4">
      <div className="bg-[#111111] border border-white/10 rounded-2xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <img
            src="https://res.cloudinary.com/dzczkq1nl/image/upload/v1780476658/stayhaki_logo_2_kptduj.png"
            alt="The Dock City"
            className="h-16 w-auto object-contain mx-auto mb-4"
          />
          <h2 className="text-white text-xl font-bold mb-1">Complete Your Profile</h2>
          <p className="text-white/40 text-sm">Just a few details to get you started on The Dock City</p>
        </div>

        <div className="space-y-4">
          {/* Full name */}
          <div>
            <label className="text-white/50 text-xs mb-1 block">Full Name</label>
            <input
              type="text"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              placeholder="Your full name"
              className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
            />
          </div>

          {/* Phone number */}
          <div>
            <label className="text-white/50 text-xs mb-1 block">Phone Number</label>
            <div className="flex gap-2">
              <div className="bg-[#0A0A0A] border border-white/10 rounded-lg px-3 py-3 text-white/50 text-sm shrink-0">
                🇰🇪 +254
              </div>
              <input
                type="tel"
                value={form.phone_number}
                onChange={e => setForm({ ...form, phone_number: e.target.value })}
                placeholder="0712 345 678"
                className="flex-1 bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
              />
            </div>
            <p className="text-white/30 text-xs mt-1">Used for booking confirmations via WhatsApp</p>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-dark border-t-transparent rounded-full animate-spin" />
            ) : 'Save & Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}