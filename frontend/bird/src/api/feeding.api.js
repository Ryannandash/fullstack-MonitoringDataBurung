import client from './client'

// GET /api/feeding
export const getFeedingSchedules = () =>
  client.get('/feeding').then(r => r.data)

// GET /api/feeding/today (frequency === 'daily')
export const getTodayFeeding = () =>
  client.get('/feeding/today').then(r => r.data)

// POST /api/feeding  body: { birdId, feedingTime, feedType, amountKg, frequency }
export const createFeedingSchedule = (payload) =>
  client.post('/feeding', payload).then(r => r.data)

// PUT /api/feeding/:id
export const updateFeedingSchedule = (id, payload) =>
  client.put(`/feeding/${id}`, payload).then(r => r.data)

export const deleteFeedingSchedule = (id) =>
  client.delete(`/feeding/${id}`).then(r => r.data)
