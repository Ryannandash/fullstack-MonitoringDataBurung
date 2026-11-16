import client from './client'

export const getReminders = (days = 14) =>
  client.get('/reminders', { params: { days } }).then((response) => response.data)
