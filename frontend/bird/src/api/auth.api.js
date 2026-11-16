import client from './client'

// POST /api/auth/login  -> { token, role }
export const login = (username, password) =>
  client.post('/auth/login', { username, password }).then(r => r.data)

// POST /api/auth/register -> { message, userId }
export const register = (payload) =>
  client.post('/auth/register', payload).then(r => r.data)

// GET /api/auth/me -> { id, username, role, fullName, createdAt }
export const getMe = () =>
  client.get('/auth/me').then(r => r.data)

// PUT /api/auth/me -> { message, user }
export const updateProfile = (payload) =>
  client.put('/auth/me', payload).then(r => r.data)

// PUT /api/auth/password -> { message }
export const changePassword = (payload) =>
  client.put('/auth/password', payload).then(r => r.data)
