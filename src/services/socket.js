import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket = null

export const setupSocketConnection = () => {
  if (socket) return socket

  // Force polling on production/Vercel to avoid WebSocket 404s/Failures
  const isProd = window.location.hostname.includes('vercel.app');

  socket = io(SOCKET_URL, {
    auth: {
      token: localStorage.getItem('token'),
    },
    transports: isProd ? ['polling'] : ['websocket', 'polling'],
    reconnectionDelay: isProd ? 5000 : 1000,
    reconnectionDelayMax: isProd ? 10000 : 5000,
    reconnectionAttempts: isProd ? 5 : Infinity,
  })

  socket.on('connect', () => {
    console.log('✅ Socket connected')
  })

  socket.on('disconnect', () => {
    console.log('❌ Socket disconnected')
  })

  socket.on('error', (error) => {
    console.error('Socket error:', error)
  })

  return socket
}

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

export default socket
