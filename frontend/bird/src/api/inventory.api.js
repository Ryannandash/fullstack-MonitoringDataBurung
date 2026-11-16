import client from './client'

export const getInventory = () =>
  client.get('/inventory').then((response) => response.data)

export const createInventoryItem = (payload) =>
  client.post('/inventory', payload).then((response) => response.data)

export const updateInventoryItem = (id, payload) =>
  client.put(`/inventory/${id}`, payload).then((response) => response.data)

export const deleteInventoryItem = (id) =>
  client.delete(`/inventory/${id}`).then((response) => response.data)

export const adjustInventory = (id, payload) =>
  client.post(`/inventory/${id}/adjust`, payload).then((response) => response.data)
