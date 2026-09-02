'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import type { ChatMessage } from '@/types/devplay'
import { chatService } from '@/services/devplay-service'

export interface LiveNotification {
  id: string
  userId: string
  username: string
  avatar: string | null
  title: string
  message: string
}

const SOCKET_URL = '/?XTransformPort=3003'

let socketInstance: Socket | null = null

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      path: '/',
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 2000,
      timeout: 15000,
    })
  }
  return socketInstance
}

export function useSocket() {
  const [isConnected, setIsConnected] = useState(() => {
    if (typeof window === 'undefined') return false
    try {
      return getSocket().connected
    } catch {
      return false
    }
  })

  useEffect(() => {
    const socket = getSocket()

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
    }
  }, [])

  return { socket: typeof window !== 'undefined' ? getSocket() : null, isConnected }
}

export function useWorldChat(currentUserId: string | null | undefined, currentUsername: string | null | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [onlineCount, setOnlineCount] = useState(0)
  const { socket, isConnected } = useSocket()
  const hasJoined = useRef(false)

  // Load initial messages + subscribe to socket events
  useEffect(() => {
    if (!socket) return

    chatService.getMessages().then(({ messages }) => {
      setMessages(messages.map((m) => ({
        id: m.id,
        userId: m.userId,
        username: m.username,
        avatar: m.user?.avatar ?? null,
        content: m.content,
        createdAt: m.createdAt,
        type: 'user' as const,
      })))
    }).catch(() => {})

    const onChatMessage = (msg: ChatMessage) => {
      setMessages((prev) => [...prev.slice(-100), msg])
    }
    const onOnlineCount = (count: number) => setOnlineCount(count)

    socket.on('chat:message', onChatMessage)
    socket.on('chat:online-count', onOnlineCount)

    return () => {
      socket.off('chat:message', onChatMessage)
      socket.off('chat:online-count', onOnlineCount)
    }
  }, [socket])

  // Auto-join chat when socket is connected and user info is available
  useEffect(() => {
    if (!socket || !isConnected || !currentUserId || !currentUsername) return
    if (hasJoined.current) return
    hasJoined.current = true
    socket.emit('chat:join', { userId: currentUserId, username: currentUsername })
  }, [socket, isConnected, currentUserId, currentUsername])

  // Reset join flag if socket disconnects (so we re-join on reconnect)
  useEffect(() => {
    if (!isConnected) {
      hasJoined.current = false
    }
  }, [isConnected])

  const sendMessage = useCallback((content: string) => {
    if (!content.trim() || !currentUserId || !currentUsername) return
    socket?.emit('chat:message', {
      userId: currentUserId,
      username: currentUsername,
      content: content.trim().slice(0, 500),
    })
  }, [socket, currentUserId, currentUsername])

  return { messages, onlineCount, sendMessage, isConnected }
}

export function useLiveNotifications(onLive: (n: LiveNotification) => void) {
  const { socket } = useSocket()

  useEffect(() => {
    if (!socket) return
    const handler = (n: LiveNotification) => onLive(n)
    socket.on('notification:live', handler)
    return () => { socket.off('notification:live', handler) }
  }, [socket, onLive])
}
