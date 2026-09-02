// API helper functions for DevPlay
const API_BASE = '/api/devplay'

async function fetchJson<T = any>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: 'Error de red' }))
    throw new Error(data.error || `Error ${res.status}`)
  }
  return res.json()
}

export interface PostMedia {
  url: string
  kind: 'image' | 'video'
}

export interface PostAuthor {
  id: string
  username: string
  avatar: string | null
  role?: string
}

export interface Post {
  id: string
  type: 'POST' | 'BETA' | 'STREAM'
  content: string | null
  mediaUrls: PostMedia[]
  createdAt: string
  author: PostAuthor
  beta: {
    id: string
    title: string
    description: string
    downloadType: 'DIRECT' | 'LINK'
    fileUrl: string | null
    fileSize: number | null
    fileName: string | null
    externalUrl: string | null
    downloads: number
  } | null
  stream: {
    id: string
    userId: string
    platform: string
    streamUrl: string
    embedUrl: string
    title: string
    isLive: boolean
    startedAt: string | null
  } | null
  likesCount: number
  commentsCount: number
  liked: boolean
}

export interface Comment {
  id: string
  postId: string
  userId: string
  content: string
  createdAt: string
  user: { id: string; username: string; avatar: string | null }
}

export interface NotificationItem {
  id: string
  userId: string
  fromUserId: string
  type: 'LIVE' | 'FOLLOW' | 'COMMENT' | 'LIKE'
  message: string
  entityId: string | null
  read: boolean
  createdAt: string
  fromUser: { id: string; username: string; avatar: string | null }
}

export interface UserProfile {
  id: string
  username: string
  bio: string | null
  avatar: string | null
  banner: string | null
  role: string
  isGuest: boolean
  createdAt: string
  followersCount: number
  followingCount: number
  postsCount: number
  isFollowing: boolean
}

export interface CurrentUser {
  id: string
  username: string
  email: string | null
  bio: string | null
  avatar: string | null
  banner: string | null
  role: string
  isGuest: boolean
}

export const api = {
  // ===== Auth =====
  register: (data: { email: string; username: string; password: string; role?: string }) =>
    fetchJson<{ id: string; username: string; email: string; role: string }>(
      `${API_BASE}/auth/register`,
      { method: 'POST', body: JSON.stringify(data) }
    ),

  createGuest: (username?: string) =>
    fetchJson<{ id: string; username: string; isGuest: boolean }>(
      `${API_BASE}/auth/guest`,
      { method: 'POST', body: JSON.stringify({ username }) }
    ),

  getSession: () =>
    fetchJson<{ user: CurrentUser | null }>(`${API_BASE}/auth/session`),

  loginNextAuth: (email: string, password: string) =>
    fetchJson<{ url?: string; error?: string | null }>(`/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email,
        password,
        csrfToken: '',
        json: 'true',
      }),
    }),

  logout: () => fetchJson(`/api/auth/signout`, { method: 'POST' }),

  // ===== Posts =====
  getPosts: (params?: { type?: string; authorId?: string; live?: boolean }) => {
    const q = new URLSearchParams()
    if (params?.type) q.set('type', params.type)
    if (params?.authorId) q.set('authorId', params.authorId)
    if (params?.live) q.set('live', '1')
    return fetchJson<{ posts: Post[] }>(`${API_BASE}/posts?${q.toString()}`)
  },

  getPost: (id: string) =>
    fetchJson<{ post: Post }>(`${API_BASE}/posts/${id}`),

  createPost: (data: {
    type: 'POST' | 'BETA' | 'STREAM'
    content?: string | null
    media?: PostMedia[]
    beta?: any
    stream?: any
  }) =>
    fetchJson<{ post: Post }>(`${API_BASE}/posts`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  deletePost: (id: string) =>
    fetchJson(`${API_BASE}/posts/${id}`, { method: 'DELETE' }),

  // ===== Comments =====
  getComments: (postId: string) =>
    fetchJson<{ comments: Comment[] }>(`${API_BASE}/posts/${postId}/comments`),

  addComment: (postId: string, content: string) =>
    fetchJson<{ comment: Comment }>(`${API_BASE}/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    }),

  // ===== Likes =====
  like: (postId: string) =>
    fetchJson(`${API_BASE}/posts/${postId}/likes`, { method: 'POST' }),

  unlike: (postId: string) =>
    fetchJson(`${API_BASE}/posts/${postId}/likes`, { method: 'DELETE' }),

  // ===== Follow =====
  getFollowStatus: (userId: string) =>
    fetchJson<{ following: boolean; followersCount: number; followingCount: number }>(
      `${API_BASE}/follow?userId=${userId}`
    ),

  follow: (followeeId: string) =>
    fetchJson(`${API_BASE}/follow`, { method: 'POST', body: JSON.stringify({ followeeId }) }),

  unfollow: (followeeId: string) =>
    fetchJson(`${API_BASE}/follow?followeeId=${followeeId}`, { method: 'DELETE' }),

  // ===== Notifications =====
  getNotifications: () =>
    fetchJson<{ notifications: NotificationItem[]; unread: number }>(`${API_BASE}/notifications`),

  markNotificationsRead: () =>
    fetchJson(`${API_BASE}/notifications`, { method: 'PATCH' }),

  // ===== Streams =====
  getLiveStreams: () =>
    fetchJson<{ streams: any[] }>(`${API_BASE}/streams`),

  goLive: (data: { platform: string; streamUrl: string; embedUrl?: string; title: string; content?: string }) =>
    fetchJson(`${API_BASE}/streams/go-live`, { method: 'POST', body: JSON.stringify(data) }),

  goOffline: () =>
    fetchJson(`${API_BASE}/streams/go-offline`, { method: 'POST' }),

  // ===== Users =====
  getUser: (id: string) =>
    fetchJson<{ user: UserProfile; posts: Post[] }>(`${API_BASE}/users/${id}`),

  getMe: () =>
    fetchJson<{ user: CurrentUser | null; liveStream: any | null }>(`${API_BASE}/users/me`),

  updateProfile: (data: { bio?: string | null; avatar?: string | null; banner?: string | null; role?: string }) =>
    fetchJson<{ user: CurrentUser }>(`${API_BASE}/users/me/profile`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ===== Chat =====
  getChatMessages: () =>
    fetchJson<{ messages: any[] }>(`${API_BASE}/chat`),

  // ===== Upload =====
  uploadFile: async (file: File, kind: 'media' | 'beta' | 'avatar' = 'media') => {
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

  // ===== Beta download URL =====
  betaDownloadUrl: (postId: string) => `${API_BASE}/betas/${postId}/download`,
}
