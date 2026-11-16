import client from './client'

// GET /api/species
export const getSpeciesList = () =>
  client.get('/species').then(r => r.data)

// GET /api/species/:id  (includes birds)
export const getSpecies = (id) =>
  client.get(`/species/${id}`).then(r => r.data)

// POST /api/species  body: { scientificName, localName, conservationStatus, dietType, avgLifespan, description }
export const createSpecies = (payload) =>
  client.post('/species', payload).then(r => r.data)

// PUT /api/species/:id
export const updateSpecies = (id, payload) =>
  client.put(`/species/${id}`, payload).then(r => r.data)

// DELETE /api/species/:id
export const deleteSpecies = (id) =>
  client.delete(`/species/${id}`).then(r => r.data)
