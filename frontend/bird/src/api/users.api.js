import client from './client'

export const getUsers = (params = {}) => client.get('/users', { params }).then((response) => response.data)
export const createUser = (payload) => client.post('/users', payload).then((response) => response.data)
export const updateUser = (id, payload) => client.put(`/users/${id}`, payload).then((response) => response.data)
export const deactivateUser = (id) => client.delete(`/users/${id}`).then((response) => response.data)
