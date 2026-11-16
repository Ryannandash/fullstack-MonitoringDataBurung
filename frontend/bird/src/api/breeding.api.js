import client from './client'

// GET /api/breeding (includes bird)
export const getBreedingRecords = () =>
  client.get('/breeding').then(r => r.data)

// GET /api/breeding/active (status in ['mating', 'incubating'])
export const getActiveBreeding = () =>
  client.get('/breeding/active').then(r => r.data)

// POST /api/breeding  body: { birdId, matingDate, eggLayingDate, eggCount, hatchingDate, chickCount, status, notes }
export const createBreedingRecord = (payload) =>
  client.post('/breeding', payload).then(r => r.data)

export const updateBreedingRecord = (id, payload) =>
  client.put(`/breeding/${id}`, payload).then(r => r.data)

export const deleteBreedingRecord = (id) =>
  client.delete(`/breeding/${id}`).then(r => r.data)
