import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'
import { Globe, Menu, X } from 'lucide-react'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

 const handleGoogleLogin = useGoogleLogin({
  onSuccess: async (tokenResponse) => {
    try {
      const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
      }).then(r => r.json())

      await loginWithGoogle(
        tokenResponse.access_token,
        userInfo.email,
        userInfo.name,
      )
    } catch {
      toast.error('Login failed. Please try again.')
    }
  },
  onError: () => toast.error('Google login failed.'),
})

  const handleListProperty = () => {
    if (!user) {
      handleGoogleLogin()
      return
    }
    if (user.role === 'host') {
      navigate('/host/listings/new')
    } else {
      navigate('/become-host')
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/')
    toast.success('Logged out.')
  }

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Stays', to: '/browse' },
    { label: 'About Us', to: '/about' },
    { label: 'Contact', to: '/contact' },
  ]

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A]/95 backdrop-blur-sm border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
            <span className="text-dark font-black text-sm">T</span>
          </div>
          <span className="text-white font-bold text-lg tracking-tight">The Dock City</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-7">
          {navLinks.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              className="text-white/70 text-sm hover:text-gold transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Right side */}
        <div className="hidden md:flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-4">
              {user.role === 'guest' && (
                <Link to="/dashboard/guest" className="text-white/60 text-sm hover:text-gold transition-colors">
                  My Trips
                </Link>
              )}
              {user.role === 'host' && (
                <Link to="/dashboard/host" className="text-white/60 text-sm hover:text-gold transition-colors">
                  Dashboard
                </Link>
              )}
              {user.role === 'admin' && (
                <Link to="/admin-panel" className="text-white/60 text-sm hover:text-gold transition-colors">
                  Admin
                </Link>
              )}
              
            </div>
          )}

          <button className="text-white/50 hover:text-white transition-colors">
            <Globe size={18} />
          </button>

          {user ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-surface border border-white/20 rounded-full flex items-center justify-center text-gold text-sm font-bold">
                {user.full_name?.[0]?.toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                className="text-sm text-white/50 hover:text-white transition-colors"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              onClick={() => handleGoogleLogin()}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Sign in
            </button>
          )}

          <button
            onClick={handleListProperty}
            className="bg-gold text-dark font-bold text-sm px-4 py-2 rounded-lg hover:bg-gold/90 transition-colors"
          >
            List Your Property
          </button>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden text-white"
        >
          {mobileOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-[#0A0A0A] border-t border-white/10 px-6 py-4 space-y-4">
          {navLinks.map(({ label, to }) => (
            <Link
              key={label}
              to={to}
              onClick={() => setMobileOpen(false)}
              className="block text-white/70 text-sm hover:text-gold transition-colors"
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 border-t border-white/10 space-y-3">
            {user ? (
              <>
                <p className="text-white/40 text-xs">{user.full_name}</p>
                <button onClick={handleLogout} className="text-sm text-red-400">Logout</button>
              </>
            ) : (
              <button onClick={() => handleGoogleLogin()} className="text-sm text-gold">Sign in with Google</button>
            )}
            <button
              onClick={handleListProperty}
              className="w-full bg-gold text-dark font-bold text-sm px-4 py-2 rounded-lg"
            >
              List Your Property
            </button>
          </div>
        </div>
      )}
    </nav>
  )
}