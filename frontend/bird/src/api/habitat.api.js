import client from './client'

// GET /api/habitats?domeId=
export const getHabitats = (domeId) =>
  client.get('/habitats', { params: domeId ? { domeId } : {} }).then(r => r.data)

// GET /api/habitats/:id (includes dome, birds)
export const getHabitat = (id) =>
  client.get(`/habitats/${id}`).then(r => r.data)

// POST /api/habitats  body: { domeId, name, vegetationType, areaSize, description }
export const createHabitat = (payload) =>
  client.post('/habitats', payload).then(r => r.data)

// PUT /api/habitats/:id
export const updateHabitat = (id, payload) =>
  client.put(`/habitats/${id}`, payload).then(r => r.data)

// DELETE /api/habitats/:id
export const deleteHabitat = (id) =>
  client.delete(`/habitats/${id}`).then(r => r.data)
