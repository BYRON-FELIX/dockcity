import { useState } from 'react'
import Navbar from '../components/Navbar'
import { Mail, Phone, MapPin, Send } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.message) {
      return toast.error('Please fill in all required fields.')
    }
    setLoading(true)
    // Simulate sending
    await new Promise(r => setTimeout(r, 1500))
    toast.success('Message sent! We\'ll get back to you within 24 hours.')
    setForm({ name: '', email: '', subject: '', message: '' })
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 pt-32 pb-20">

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-white text-4xl font-bold mb-3">
            Get in <span className="text-gold">Touch</span>
          </h1>
          <p className="text-white/40 text-lg">
            Have a question or need help? We're here for you.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Contact info */}
          <div className="space-y-5">
            {[
              { icon: Mail, label: 'Email', value: 'hello@thedockcity.com' },
              { icon: Phone, label: 'Phone', value: '+254 113 203 486' },
              { icon: MapPin, label: 'Location', value: 'Nairobi, Kenya' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="bg-[#111111] border border-white/8 rounded-xl p-5 flex items-center gap-4">
                <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-gold" />
                </div>
                <div>
                  <p className="text-white/40 text-xs mb-0.5">{label}</p>
                  <p className="text-white text-sm font-medium">{value}</p>
                </div>
              </div>
            ))}

            <div className="bg-[#111111] border border-white/8 rounded-xl p-5">
              <p className="text-white font-semibold text-sm mb-1">Support Hours</p>
              <p className="text-white/40 text-xs leading-relaxed">
                Monday — Friday: 8am – 8pm<br />
                Saturday: 9am – 5pm<br />
                Sunday: 10am – 4pm
              </p>
            </div>
          </div>

          {/* Contact form */}
          <div className="md:col-span-2 bg-[#111111] border border-white/8 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-5">Send us a message</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Your Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={e => setForm({ ...form, name: e.target.value })}
                    placeholder="Full name"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
                <div>
                  <label className="text-white/50 text-xs mb-1 block">Email Address *</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={e => setForm({ ...form, email: e.target.value })}
                    placeholder="you@email.com"
                    className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Subject</label>
                <input
                  type="text"
                  value={form.subject}
                  onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="What is this about?"
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="text-white/50 text-xs mb-1 block">Message *</label>
                <textarea
                  rows={5}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  placeholder="Tell us how we can help..."
                  className="w-full bg-[#0A0A0A] border border-white/10 rounded-lg px-4 py-3 text-white text-sm focus:outline-none focus:border-gold resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-gold text-dark font-bold py-3 rounded-xl hover:bg-gold/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-dark border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send size={16} />
                    Send Message
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}