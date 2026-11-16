import client from './client'

// GET /api/birds?speciesId=&domeId=
export const getBirds = (params = {}) =>
  client.get('/birds', { params }).then(r => r.data)

// GET /api/birds/:id
export const getBird = (id) =>
  client.get(`/birds/${id}`).then(r => r.data)

// POST /api/birds  body: { speciesId, habitatId, ringNumber, name, birthDate, gender, statusHealth, uniqueMark }
export const createBird = (payload) =>
  client.post('/birds', payload).then(r => r.data)

// PUT /api/birds/:id
export const updateBird = (id, payload) =>
  client.put(`/birds/${id}`, payload).then(r => r.data)

// DELETE /api/birds/:id
export const deleteBird = (id) =>
  client.delete(`/birds/${id}`).then(r => r.data)

