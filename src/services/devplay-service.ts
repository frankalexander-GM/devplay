/**
 * ============================================================
 *  DEVPLAY — Capa de Servicios
 * ============================================================
 *  Cliente API que abstrae todas las llamadas al backend.
 *  Usa los tipos de dominio de src/types/devplay.ts
 * ============================================================
 */

import type {
  AuthResponse,
  Comment,
  CreatePostPayload,
  CreateStreamPayload,
  CurrentUser,
  DevCoinTransaction,
  NotificationItem,
  Post,
  StoreItem,
  StorePurchase,
  Stream,
  UpdateProfilePayload,
  UploadResult,
  UserProfile,
} from '@/types/devplay'

const API_BASE = '/api/devplay'

async function fetchJson<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error de red' }))
    throw new Error(data.error || `Error ${res.status}`)
  }
  return res.json()
}

/**
 * Servicio de Autenticación
 */
export const authService = {
  register: (data: { email: string; username: string; password: string; role?: 'PLAYER' | 'DEV' }) =>
    fetchJson<AuthResponse>(`${API_BASE}/auth/register`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  createGuest: (username?: string) =>
    fetchJson<AuthResponse>(`${API_BASE}/auth/guest`, {
      method: 'POST',
      body: JSON.stringify({ username }),
    }),

  getSession: () => fetchJson<{ user: CurrentUser | null }>(`${API_BASE}/auth/session`),
}

/**
 * Servicio de Publicaciones (Posts / Betas / Streams)
 */
export const postService = {
  list: (params?: { type?: string; authorId?: string; live?: boolean; media?: 'video' | 'image'; feed?: 'following' | 'news' | 'foryou' }) => {
    const q = new URLSearchParams()
    if (params?.type) q.set('type', params.type)
    if (params?.authorId) q.set('authorId', params.authorId)
    if (params?.live) q.set('live', '1')
    if (params?.media) q.set('media', params.media)
    if (params?.feed) q.set('feed', params.feed)
    return fetchJson<{ posts: Post[] }>(`${API_BASE}/posts?${q.toString()}`)
  },

  get: (id: string) => fetchJson<{ post: Post }>(`${API_BASE}/posts/${id}`),

  create: (data: CreatePostPayload) =>
    fetchJson<{ post: Post }>(`${API_BASE}/posts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  delete: (id: string) => fetchJson(`${API_BASE}/posts/${id}`, { method: 'DELETE' }),

  edit: (id: string, content: string) =>
    fetchJson(`${API_BASE}/posts/${id}`, { method: 'PATCH', body: JSON.stringify({ content }) }),

  // Comentarios
  getComments: (postId: string) =>
    fetchJson<{ comments: Comment[] }>(`${API_BASE}/posts/${postId}/comments`),

  addComment: (postId: string, content: string) =>
    fetchJson<{ comment: Comment }>(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Likes
  like: (postId: string) =>
    fetchJson(`${API_BASE}/posts/${postId}/likes`, { method: 'POST' }),

  unlike: (postId: string) =>
    fetchJson(`${API_BASE}/posts/${postId}/likes`, { method: 'DELETE' }),

  // Repost
  repost: (postId: string, content?: string) =>
    fetchJson<{ post: Post }>(`${API_BASE}/posts/${postId}/repost`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // Bookmarks
  save: (postId: string) =>
    fetchJson(`${API_BASE}/posts/${postId}/bookmarks`, { method: 'POST' }),

  unsave: (postId: string) =>
    fetchJson(`${API_BASE}/posts/${postId}/bookmarks`, { method: 'DELETE' }),

  getBookmarks: () =>
    fetchJson<{ posts: Post[] }>(`${API_BASE}/users/me/bookmarks`),

  // Stats & Achievements
  getStats: () =>
    fetchJson<{ stats: any }>(`${API_BASE}/users/me/stats`),

  getAchievements: () =>
    fetchJson<{ achievements: any[]; totalUnlocked: number; total: number }>(`${API_BASE}/users/me/achievements`),

  // Polls
  getPoll: (postId: string) =>
    fetchJson<{ poll: any }>(`${API_BASE}/posts/${postId}/poll`),

  votePoll: (postId: string, optionIds: string[]) =>
    fetchJson<{ poll: any }>(`${API_BASE}/posts/${postId}/poll`, {
      method: 'POST',
      body: JSON.stringify({ optionIds }),
    }),
}

/**
 * Servicio de Betas
 */
export const betaService = {
  downloadUrl: (postId: string) => `${API_BASE}/betas/${postId}/download`,

  edit: (postId: string, data: any) =>
    fetchJson(`${API_BASE}/betas/${postId}/edit`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

/**
 * Servicio de Streams
 */
export const streamService = {
  listLive: () => fetchJson<{ streams: Stream[] }>(`${API_BASE}/streams`),

  goLive: (data: CreateStreamPayload) =>
    fetchJson(`${API_BASE}/streams/go-live`, { method: 'POST', body: JSON.stringify(data) }),

  goOffline: () => fetchJson(`${API_BASE}/streams/go-offline`, { method: 'POST' }),
}

/**
 * Servicio de Usuarios y Perfil
 */
export const userService = {
  get: (id: string) =>
    fetchJson<{ user: UserProfile; posts: Post[] }>(`${API_BASE}/users/${id}`),

  getByUsername: (username: string) =>
    fetchJson<{ user: { id: string; username: string } | null }>(`${API_BASE}/users/by-username/${encodeURIComponent(username)}`),

  getMe: () =>
    fetchJson<{ user: CurrentUser | null; liveStream: Stream | null }>(`${API_BASE}/users/me`),

  updateProfile: (data: UpdateProfilePayload) =>
    fetchJson<{ user: CurrentUser }>(`${API_BASE}/users/me/profile`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

/**
 * Servicio de Descubrimiento
 */
export const discoverService = {
  get: () =>
    fetchJson<{
      trending: Post[]
      recommendedUsers: any[]
      popularBetas: any[]
      popularTags: { tag: string; count: number }[]
      recent: Post[]
    }>(`${API_BASE}/discover`),
}

/**
 * Servicio de Follow
 */
export const followService = {
  getStatus: (userId: string) =>
    fetchJson<{ following: boolean; followersCount: number; followingCount: number }>(
      `${API_BASE}/follow?userId=${userId}`
    ),

  follow: (followeeId: string) =>
    fetchJson(`${API_BASE}/follow`, { method: 'POST', body: JSON.stringify({ followeeId }) }),

  unfollow: (followeeId: string) =>
    fetchJson(`${API_BASE}/follow?followeeId=${followeeId}`, { method: 'DELETE' }),

  getFollowers: (userId: string) =>
    fetchJson<{ followers: import('@/types/devplay').FollowListUser[]; total: number }>(
      `${API_BASE}/users/${userId}/followers`
    ),

  getFollowing: (userId: string) =>
    fetchJson<{ following: import('@/types/devplay').FollowListUser[]; total: number }>(
      `${API_BASE}/users/${userId}/following`
    ),
}

/**
 * Servicio de Notificaciones
 */
export const notificationService = {
  list: () =>
    fetchJson<{ notifications: NotificationItem[]; unread: number }>(`${API_BASE}/notifications`),

  markRead: () => fetchJson(`${API_BASE}/notifications`, { method: 'PATCH' }),
}

/**
 * Servicio de Chat
 */
export const chatService = {
  getMessages: () => fetchJson<{ messages: any[] }>(`${API_BASE}/chat`),
  // Elimina un mensaje propio por id
  deleteMessage: (id: string) =>
    fetchJson<{ ok: boolean; deleted: number }>(`${API_BASE}/chat`, {
      method: 'DELETE',
      body: JSON.stringify({ id }),
    }),
  // Elimina todos los mensajes propios de la sala
  deleteMyMessages: () =>
    fetchJson<{ ok: boolean; deleted: number }>(`${API_BASE}/chat`, {
      method: 'DELETE',
      body: JSON.stringify({ all: true }),
    }),
}

/**
 * Servicio de Upload
 */
export const uploadService = {
  upload: async (file: File, kind: 'media' | 'beta' | 'avatar' = 'media'): Promise<UploadResult> => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('kind', kind)
    const res = await fetch(`${API_BASE}/upload`, {
      method: 'POST',
      body: formData,
      credentials: 'include',
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: 'Error de subida' }))
      throw new Error(data.error || `Error ${res.status}`)
    }
    return res.json()
  },
}

/**
 * Servicio de Tienda (Store)
 */
export const storeService = {
  getItems: () =>
    fetchJson<{ items: StoreItem[]; grouped: Record<string, StoreItem[]> }>(`${API_BASE}/store/items`),

  buy: (itemId: string) =>
    fetchJson<{ success: boolean; purchase: StorePurchase; transaction: DevCoinTransaction; balance: number }>(
      `${API_BASE}/store/buy`,
      { method: 'POST', body: JSON.stringify({ itemId }) }
    ),

  getMyItems: () =>
    fetchJson<{ items: StorePurchase[] }>(`${API_BASE}/store/my-items`),

  getBalance: () =>
    fetchJson<{ balance: number; transactions: DevCoinTransaction[] }>(`${API_BASE}/store/balance`),
}

/* ============================================================
   dmService — mensajería privada 💬
   ============================================================ */

export interface DMPeer {
  id: string
  username: string
  avatar: string | null
  fullName: string | null
}

export interface DMMessage {
  id: string
  senderId: string
  recipientId: string
  content: string
  createdAt: string
  readAt: string | null
  sender?: DMPeer
}

export interface DMConversation {
  peerId: string
  peer: DMPeer
  lastContent: string
  lastAt: string
  lastMine: boolean
  unread: number
}

export const dmService = {
  list: () =>
    fetchJson<{ conversations: DMConversation[] }>(`${API_BASE}/dm`),

  thread: (userId: string) =>
    fetchJson<{ peer: DMPeer; messages: DMMessage[] }>(`${API_BASE}/dm/${userId}`),

  send: (userId: string, content: string) =>
    fetchJson<{ message: DMMessage }>(`${API_BASE}/dm/${userId}`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),
}
