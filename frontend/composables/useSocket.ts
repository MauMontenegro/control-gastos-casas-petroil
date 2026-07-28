import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

let socket: Socket | null = null

/**
 * Composable base de tiempo real. Aún no hay backend con servidor
 * Socket.io, pero queda listo para conectarse en cuanto exista
 * (bot de Telegram / RPA empujarán eventos por aquí).
 */
export function useSocket() {
  const config = useRuntimeConfig()
  const isConnected = useState('socket-connected', () => false)

  function connect() {
    if (socket) return socket
    socket = io(config.public.socketUrl as string, { autoConnect: true })
    socket.on('connect', () => (isConnected.value = true))
    socket.on('disconnect', () => (isConnected.value = false))
    return socket
  }

  function disconnect() {
    socket?.disconnect()
    socket = null
    isConnected.value = false
  }

  return { connect, disconnect, isConnected }
}
