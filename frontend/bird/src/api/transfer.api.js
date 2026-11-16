import client from './client'

export const getTransfers = () =>
  client.get('/transfers').then((response) => response.data)

export const createTransfer = (payload) =>
  client.post('/transfers', payload).then((response) => response.data)

export const reviewTransfer = (id, payload) =>
  client.patch(`/transfers/${id}/review`, payload).then((response) => response.data)
