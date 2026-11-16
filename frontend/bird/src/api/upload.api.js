import client from './client'

export const getDocuments = (params = {}) =>
  client.get('/uploads', { params }).then((response) => response.data)

export const uploadDocument = ({ file, ...metadata }) => {
  const formData = new FormData()
  formData.append('file', file)
  Object.entries(metadata).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') formData.append(key, value)
  })
  return client.post('/uploads', formData).then((response) => response.data)
}

export const deleteDocument = (id) =>
  client.delete(`/uploads/${id}`).then((response) => response.data)
