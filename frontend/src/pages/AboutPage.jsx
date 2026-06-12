import Navbar from '../components/Navbar'
import { ShieldCheck, Users, CreditCard, Star } from 'lucide-react'

const VALUES = [
  { icon: ShieldCheck, title: 'Trust First', desc: 'Every host and listing is manually verified by our team before going live. No shortcuts.' },
  { icon: CreditCard, title: 'Safe Payments', desc: 'Guest funds go into escrow and are only released after check-in is confirmed. Hosts never receive unearned money.' },
  { icon: Users, title: 'Real People', desc: 'We verify every guest ID and every host identity. Fake accounts have no place on The Dock City.' },
  { icon: Star, title: 'Quality Stays', desc: 'We only list properties that meet our standards. Every listing is reviewed for accuracy and quality.' },
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-20">

        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-6">
            <ShieldCheck size={13} className="text-gold" />
            <span className="text-white/60 text-xs font-medium tracking-wide">ABOUT THE DOCK CITY</span>
          </div>
          <h1 className="text-white text-4xl md:text-5xl font-bold mb-4">
            Built for Trust.<br />
            <span className="text-gold">Built for Nairobi.</span>
          </h1>
          <p className="text-white/40 text-lg max-w-2xl mx-auto leading-relaxed">
            The Dock City was born from a simple frustration — finding a short stay in Nairobi
            was risky, stressful, and full of scams. We built the platform we wished existed.
          </p>
        </div>

        {/* Story */}
        <div className="bg-[#111111] border border-white/8 rounded-2xl p-8 mb-12">
          <h2 className="text-white text-2xl font-bold mb-4">Our Story</h2>
          <div className="space-y-4 text-white/50 text-sm leading-relaxed">
            <p>
              Short-stay rentals in Nairobi have always been a gamble. Photos don't match reality,
              payments disappear, and hosts ghost guests at the last minute. Guests had no protection,
              and good hosts had no way to stand out from bad actors.
            </p>
            <p>
              The Dock City changes that. We built a platform where every host is vetted, every listing
              is reviewed, and every payment is protected by escrow. Guests book with confidence.
              Hosts earn with certainty.
            </p>
            <p>
              We started in Nairobi because we know Nairobi. Every neighborhood, every estate,
              every type of traveler. The Dock City is built specifically for this market — not a
              copy-paste of a Western platform.
            </p>
          </div>
        </div>

        {/* Values */}
        <h2 className="text-white text-2xl font-bold mb-6">What We Stand For</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-16">
          {VALUES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="bg-[#111111] border border-white/8 rounded-xl p-6">
              <div className="w-10 h-10 bg-[#1A1A1A] rounded-xl flex items-center justify-center mb-4">
                <Icon size={18} className="text-gold" />
              </div>
              <h3 className="text-white font-semibold mb-2">{title}</h3>
              <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-5 text-center">
          {[
            { value: 'Nairobi', label: 'Starting City' },
            { value: '100%', label: 'Listings Verified' },
            { value: 'Escrow', label: 'Payment Protection' },
          ].map(({ value, label }) => (
            <div key={label} className="bg-[#111111] border border-white/8 rounded-xl p-6">
              <p className="text-gold text-2xl font-bold mb-1">{value}</p>
              <p className="text-white/40 text-xs">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}