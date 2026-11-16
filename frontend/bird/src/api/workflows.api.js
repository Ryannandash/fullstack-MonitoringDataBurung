import client from './client'

const request = (method, path, payload) => client[method](path, payload).then((response) => response.data)

export const getTrainingRecords = (params = {}) => client.get('/workflows/training', { params }).then((response) => response.data)
export const createTrainingRecord = (payload) => request('post', '/workflows/training', payload)
export const updateTrainingRecord = (id, payload) => request('put', `/workflows/training/${id}`, payload)
export const deleteTrainingRecord = (id) => request('delete', `/workflows/training/${id}`)

export const getCleaningRecords = (params = {}) => client.get('/workflows/cleaning', { params }).then((response) => response.data)
export const createCleaningRecord = (payload) => request('post', '/workflows/cleaning', payload)
export const updateCleaningRecord = (id, payload) => request('put', `/workflows/cleaning/${id}`, payload)
export const deleteCleaningRecord = (id) => request('delete', `/workflows/cleaning/${id}`)

export const getTasks = () => request('get', '/workflows/tasks')
export const getTaskKeepers = () => request('get', '/workflows/tasks/keepers')
export const createTask = (payload) => request('post', '/workflows/tasks', payload)
export const updateTask = (id, payload) => request('put', `/workflows/tasks/${id}`, payload)
export const deleteTask = (id) => request('delete', `/workflows/tasks/${id}`)
export const updateTaskStatus = (id, payload) => request('patch', `/workflows/tasks/${id}/status`, payload)

export const getDailyReports = (params = {}) => client.get('/workflows/daily-reports', { params }).then((response) => response.data)
export const createDailyReport = (payload) => request('post', '/workflows/daily-reports', payload)
export const getDailyReport = (id) => request('get', `/workflows/daily-reports/${id}`)
export const submitDailyReport = (id) => request('post', `/workflows/daily-reports/${id}/submit`, {})
export const reviewDailyReport = (id, payload) => request('post', `/workflows/daily-reports/${id}/review`, payload)

export const getNotifications = () => request('get', '/workflows/notifications')
export const markNotificationRead = (id) => request('patch', `/workflows/notifications/${id}/read`, {})
export const markAllNotificationsRead = () => request('patch', '/workflows/notifications/read-all', {})

export const getMedicalTreatments = () => request('get', '/workflows/medical-treatments')
export const createMedicalTreatment = (payload) => request('post', '/workflows/medical-treatments', payload)
export const updateMedicalTreatment = (id, payload) => request('put', `/workflows/medical-treatments/${id}`, payload)
export const deleteMedicalTreatment = (id) => request('delete', `/workflows/medical-treatments/${id}`)
