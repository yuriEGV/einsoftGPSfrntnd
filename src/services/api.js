import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

// Cross-browser safe storage — falls back to sessionStorage if localStorage is blocked
export const safeStorage = {
  get(key) {
    try { return localStorage.getItem(key) } catch (_) { /* fallback */ }
    try { return sessionStorage.getItem(key) } catch (_) { /* fallback */ }
    return null
  },
  set(key, value) {
    try { localStorage.setItem(key, value); return } catch (_) { /* fallback */ }
    try { sessionStorage.setItem(key, value) } catch (_) { /* fallback */ }
  },
  remove(key) {
    try { localStorage.removeItem(key) } catch (_) { /* fallback */ }
    try { sessionStorage.removeItem(key) } catch (_) { /* fallback */ }
  },
}

export const apiClient = axios.create({
  baseURL: API_BASE,
  withCredentials: false,
  headers: { 'Content-Type': 'application/json' },
})

apiClient.interceptors.request.use((config) => {
  const token = safeStorage.get('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config
    // Si es un error de red temporal (DNS flicker, ERR_NAME_NOT_RESOLVED, micro-corte), reintentar una vez
    if (!error.response && config && !config._isRetry) {
      config._isRetry = true
      await new Promise((r) => setTimeout(r, 1500))
      return apiClient(config)
    }

    if (error.response?.status === 401) {
      safeStorage.remove('token')
      safeStorage.remove('refreshToken')
      safeStorage.remove('user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
