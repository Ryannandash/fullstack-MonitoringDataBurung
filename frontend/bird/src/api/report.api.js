import client from './client'

// GET /api/reports/all -> all activity, health, and transfer records
export const getAllReport = () =>
  client.get('/reports/all').then(r => r.data)

// GET /api/reports/daily -> { date, totalActivities, data }
export const getDailyReport = () =>
  client.get('/reports/daily').then(r => r.data)

// GET /api/reports/weekly -> { startDate, totalActivities, data }
export const getWeeklyReport = () =>
  client.get('/reports/weekly').then(r => r.data)

// GET /api/reports/monthly -> { startDate, totalActivities, data }
export const getMonthlyReport = () =>
  client.get('/reports/monthly').then(r => r.data)

// GET /api/reports/species/:id -> { speciesId, totalBirds, totalActivities, data }
export const getSpeciesReport = (id) =>
  client.get(`/reports/species/${id}`).then(r => r.data)
