import { createContext, useContext, useState, useEffect } from 'react'
import api from '../api/axios'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [userMode, setUserMode] = useState(() => {
    return localStorage.getItem('dock_city_mode') || 'guest'
  })
  const [loading, setLoading] = useState(true)
  const [needsProfile, setNeedsProfile] = useState(false)

  const switchToHost = () => {
    localStorage.setItem('dock_city_mode', 'host')
    setUserMode('host')
  }

  const switchToGuest = () => {
    localStorage.setItem('dock_city_mode', 'guest')
    setUserMode('guest')
  }

  const checkNeedsProfile = (userData) => {
    
    // Only show modal if logged in and phone number is missing
    if (userData && !userData.phone_number) {
      setNeedsProfile(true)
    } else {
      setNeedsProfile(false)
    }
  }

  useEffect(() => {
    const token = localStorage.getItem('access_token')
    if (token) {
      api.get('/auth/me/')
        .then(res => {
          setUser(res.data)
          checkNeedsProfile(res.data)
        })
        .catch(() => {
          localStorage.clear()
          setNeedsProfile(false)
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const loginWithGoogle = async (idToken, email, fullName) => {
    const res = await api.post('/auth/google/', {
      id_token: idToken,
      email,
      full_name: fullName,
    })
    localStorage.setItem('access_token', res.data.tokens.access)
    localStorage.setItem('refresh_token', res.data.tokens.refresh)
    setUser(res.data.user)
    checkNeedsProfile(res.data.user)
    return res.data.user
  }

  const updateProfile = (updatedUser) => {
    setUser(updatedUser)
    setNeedsProfile(false)
  }

  const logout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('dock_city_mode')
    setUser(null)
    setUserMode('guest')
    setNeedsProfile(false)
  }

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading,
      needsProfile,
      loginWithGoogle,
      logout,
      updateProfile,
      userMode,
      switchToHost,
      switchToGuest,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)