import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useGoogleLogin } from '@react-oauth/google'
import { Globe, Menu, X } from 'lucide-react'
import { useActiveTripsCount } from '../hooks/useActiveTripsCount'
import api from '../api/axios'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout, loginWithGoogle } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const hasGoogleClientId = Boolean((import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim())

  const activeTripsCount = useActiveTripsCount(user?.role === 'guest')

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

  const handleLocalDevLogin = async () => {
    const email = window.prompt('Local dev login: enter your email')?.trim()
    if (!email) return

    const fullNameInput = window.prompt('Local dev login: enter full name (optional)')?.trim()
    const fallbackName = email.includes('@') ? email.split('@')[0] : 'Local User'

    try {
      await loginWithGoogle('', email, fullNameInput || fallbackName)
      toast.success('Signed in with local dev fallback.')
    } catch {
      toast.error('Local dev login failed. Check that backend is running on localhost:8000.')
    }
  }

  const handleSignIn = () => {
    if (!hasGoogleClientId) {
      if (import.meta.env.DEV) {
        void handleLocalDevLogin()
        return
      }
      toast.error('Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID in frontend/.env.local')
      return
    }

    handleGoogleLogin()
  }

  const handleListProperty = () => {
    if (!user) {
      handleSignIn()
      return
    }
    if (user.role === 'host') {
      navigate('/host/listings/new')
    } else {
      navigate('/become-host')
    }
  }

  const handleLogout = () => {
    setProfileMenuOpen(false)
    logout()
    navigate('/')
    toast.success('Logged out.')
  }

  const handleSwitchToHost = () => {
    setProfileMenuOpen(false)
    if (user?.host_profile_status === 'approved') {
      navigate('/dashboard/host')
    } else if (user?.host_profile_status === 'pending') {
      navigate('/dashboard/host')
    } else {
      navigate('/become-host')
    }
  }

  const handleSwitchToGuest = () => {
    setProfileMenuOpen(false)
    navigate('/dashboard/guest')
  }

  const navLinks = [
    { label: 'Home', to: '/' },
    { label: 'Stays', to: '/browse' },
    { label: 'Properties for Sale', to: '/properties-for-sale' },
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
                <Link to="/dashboard/guest" className="relative text-white/60 text-sm hover:text-gold transition-colors">
                  My Trips
                  {activeTripsCount > 0 && (
                    <span className="absolute -top-2 -right-3 bg-gold text-dark text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {activeTripsCount}
                    </span>
                  )}
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
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="w-9 h-9 rounded-full bg-gold/10 border border-gold/20 text-gold font-bold text-sm flex items-center justify-center hover:bg-gold/20 transition-colors"
              >
                {user.full_name?.[0]?.toUpperCase() || 'U'}
              </button>

              {profileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 bg-[#111111] border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-white/8">
                      <p className="text-white text-sm font-semibold truncate">{user.full_name}</p>
                      <p className="text-white/30 text-xs truncate">{user.email}</p>
                    </div>

                    <div className="py-1">
                      <button
                        onClick={handleSwitchToGuest}
                        className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-gold transition-colors flex items-center gap-2"
                      >
                        Switch to Guest Dashboard
                      </button>
                      <button
                        onClick={handleSwitchToHost}
                        className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-gold transition-colors flex items-center gap-2"
                      >
                        {user.host_profile_status === 'approved'
                          ? 'Switch to Host Dashboard'
                          : user.host_profile_status === 'pending'
                            ? 'View Application Status'
                            : 'Become a Host'}
                      </button>
                      <button
                        onClick={() => { setProfileMenuOpen(false); navigate('/properties-for-sale/list') }}
                        className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-gold transition-colors flex items-center gap-2"
                      >
                        List Property for Sale
                      </button>
                      {user.role === 'admin' && (
                        <button
                          onClick={() => { setProfileMenuOpen(false); navigate('/admin-panel') }}
                          className="w-full text-left px-4 py-2.5 text-sm text-white/70 hover:bg-white/5 hover:text-gold transition-colors flex items-center gap-2"
                        >
                          Admin Panel
                        </button>
                      )}
                    </div>

                    <div className="border-t border-white/8 py-1">
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-400 hover:bg-red-400/5 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={handleSignIn}
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

          {/* Role-based links — same as desktop nav */}
          {user && (
            <div className="pt-2 border-t border-white/10 space-y-3">
              {user.role === 'guest' && (
                <Link
                  to="/dashboard/guest"
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-white/70 text-sm hover:text-gold transition-colors"
                >
                  My Trips
                  {activeTripsCount > 0 && (
                    <span className="bg-gold text-dark text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {activeTripsCount}
                    </span>
                  )}
                </Link>
              )}
              {user.role === 'host' && (
                <Link
                  to="/dashboard/host"
                  onClick={() => setMobileOpen(false)}
                  className="block text-white/70 text-sm hover:text-gold transition-colors"
                >
                  Dashboard
                </Link>
              )}
              {user.role === 'admin' && (
                <Link
                  to="/admin-panel"
                  onClick={() => setMobileOpen(false)}
                  className="block text-white/70 text-sm hover:text-gold transition-colors"
                >
                  Admin
                </Link>
              )}
            </div>
          )}

          {/* Profile actions — mobile */}
          {user && (
            <div className="pt-2 border-t border-white/10 space-y-3">
              <p className="text-white/30 text-xs">{user.full_name} · {user.email}</p>

              {/* Switch dashboard */}
              {user.host_profile_status === 'approved' && (
                <button
                  onClick={() => { setMobileOpen(false); navigate('/dashboard/host') }}
                  className="flex items-center gap-2 text-white/70 text-sm hover:text-gold transition-colors"
                >
                  🏠 Host Dashboard
                </button>
              )}
              {user.host_profile_status === 'pending' && (
                <button
                  onClick={() => { setMobileOpen(false); navigate('/dashboard/host') }}
                  className="flex items-center gap-2 text-white/70 text-sm hover:text-gold transition-colors"
                >
                  🏠 View Application Status
                </button>
              )}
              {!user.host_profile_status && (
                <button
                  onClick={() => { setMobileOpen(false); navigate('/become-host') }}
                  className="flex items-center gap-2 text-white/70 text-sm hover:text-gold transition-colors"
                >
                  🏠 Become a Host
                </button>
              )}

              {/* List property for sale */}
              <button
                onClick={() => { setMobileOpen(false); navigate('/properties-for-sale/list') }}
                className="flex items-center gap-2 text-white/70 text-sm hover:text-gold transition-colors"
              >
                🏷️ List Property for Sale
              </button>

              {/* Admin panel */}
              {user.role === 'admin' && (
                <button
                  onClick={() => { setMobileOpen(false); navigate('/admin-panel') }}
                  className="flex items-center gap-2 text-white/70 text-sm hover:text-gold transition-colors"
                >
                  🛠️ Admin Panel
                </button>
              )}
            </div>
          )}

          <div className="pt-2 border-t border-white/10 space-y-3">
            {user ? (
              <>
                <p className="text-white/40 text-xs">{user.full_name}</p>
                <button onClick={handleLogout} className="text-sm text-red-400">Logout</button>
              </>
            ) : (
              <button
                onClick={handleSignIn}
                className="text-sm text-gold"
              >
                Sign in with Google
              </button>
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