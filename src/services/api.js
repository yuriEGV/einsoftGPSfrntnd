import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export const apiClient = axios.create({
  baseURL: API_BASE,
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

