import { io } from 'socket.io-client'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000'

let socket = null

// Vercel serverless does NOT support WebSockets/Socket.io.
// In production, we rely on HTTP polling (refetchInterval) instead.
const IS_VERCEL_PROD = window.location.hostname.includes('vercel.app')

// A no-op socket stub so existing .on()/.emit() calls don't crash in production
const noopSocket = {
  on: () => noopSocket,
  off: () => noopSocket,
  emit: () => noopSocket,
  disconnect: () => {},
  connected: false,
}

export const setupSocketConnection = () => {
  if (IS_VERCEL_PROD) {
    console.info('ℹ️ Socket.io disabled in Vercel production — using HTTP polling instead.')
    return noopSocket
  }

  if (socket) return socket

  socket = io(SOCKET_URL, {
    auth: {
      token: localStorage.getItem('token'),
    },
    transports: ['websocket', 'polling'],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
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
