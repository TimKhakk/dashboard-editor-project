import { io } from "socket.io-client"

const SERVER = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001'

export const socket = io(SERVER, { transports: ['websocket'] })
