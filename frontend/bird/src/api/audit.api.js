import client from './client'

export const getAuditLogs = () =>
  client.get('/audit').then((response) => response.data)
