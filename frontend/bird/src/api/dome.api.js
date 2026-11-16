import client from './client'

// GET /api/domes (includes habitats)
export const getDomes = () =>
  client.get('/domes').then(r => r.data)

// GET /api/domes/:id
export const getDome = (id) =>
  client.get(`/domes/${id}`).then(r => r.data)

// POST /api/domes  body: { name, region, areaSize }
export const createDome = (payload) =>
  client.post('/domes', payload).then(r => r.data)

// PUT /api/domes/:id
export const updateDome = (id, payload) =>
  client.put(`/domes/${id}`, payload).then(r => r.data)

// DELETE /api/domes/:id
export const deleteDome = (id) =>
  client.delete(`/domes/${id}`).then(r => r.data)
