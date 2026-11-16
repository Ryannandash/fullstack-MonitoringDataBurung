const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export const resolveMediaUrl = (fileUrl) =>
  fileUrl ? new URL(fileUrl, apiBaseUrl).toString() : ''
