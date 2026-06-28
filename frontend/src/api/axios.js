import axios from 'axios'

const DEFAULT_API_URL = 'http://localhost:8000/api'
const rawApiUrl = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).trim()
const cleanedApiUrl = rawApiUrl.replace(/\/+$/, '')
const API_BASE_URL = cleanedApiUrl.endsWith('/api') ? cleanedApiUrl : `${cleanedApiUrl}/api`

if (!import.meta.env.VITE_API_URL) {
  // Make local development resilient when env vars are not set.
  console.warn(`VITE_API_URL is not set. Falling back to ${DEFAULT_API_URL}`)
} else if (!cleanedApiUrl.endsWith('/api')) {
  console.warn(`VITE_API_URL should include /api. Using normalized value: ${API_BASE_URL}`)
}

const api = axios.create({
  baseURL: API_BASE_URL,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Auto refresh token on 401
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refresh = localStorage.getItem('refresh_token')
      if (refresh) {
        try {
          const res = await axios.post(
            `${API_BASE_URL}/auth/token/refresh/`,
            { refresh }
          )
          localStorage.setItem('access_token', res.data.access)
          original.headers.Authorization = `Bearer ${res.data.access}`
          return api(original)
        } catch {
          localStorage.clear()
          window.location.href = '/'
        }
      }
    }
    return Promise.reject(error)
  }
)

export default api