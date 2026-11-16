import client from './client'

export const getHealthRecords = () =>
  client.get('/health').then((response) => response.data)

export const getBirdHealthRecords = (birdId) =>
  client.get(`/health/bird/${birdId}`).then((response) => response.data)

export const createHealthRecord = (payload) =>
  client.post('/health', payload).then((response) => response.data)

export const updateHealthRecord = (id, payload) =>
  client.put(`/health/${id}`, payload).then((response) => response.data)

export const deleteHealthRecord = (id) =>
  client.delete(`/health/${id}`).then((response) => response.data)
