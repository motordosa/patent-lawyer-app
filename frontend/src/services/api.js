import axios from 'axios'

// 로컬: localhost:8000 / 프로덕션: VITE_API_URL 환경변수 (Vercel에서 설정)
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 180000,  // 3분 — 파이프라인 LLM 순차 호출 지원
})

// ── Auth token injection ───────────────────────────────────────────────────
API.interceptors.request.use(config => {
  const token = localStorage.getItem('patent_token')
  if (token) {
    config.headers = config.headers || {}
    config.headers['Authorization'] = `Bearer ${token}`
  }
  return config
})

// ── 401 → redirect to login ─────────────────────────────────────────────────
API.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      // Only clear and redirect if we actually have a token (to avoid redirect loops on login page)
      const token = localStorage.getItem('patent_token')
      if (token) {
        localStorage.removeItem('patent_token')
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)


export const projectsAPI = {
  list: () => API.get('/projects/'),
  create: (data) => API.post('/projects/', data),
  get: (id) => API.get(`/projects/${id}`),
  update: (id, data) => API.patch(`/projects/${id}`, data),
  delete: (id) => API.delete(`/projects/${id}`),
}

export const ideationAPI = {
  generate: (data) => API.post('/ideation/generate', data),
  get: (projectId) => API.get(`/ideation/${projectId}`),
}

export const clearanceAPI = {
  search: (data) => API.post('/clearance/search', data),
  get: (projectId) => API.get(`/clearance/${projectId}`),
}

export const draftingAPI = {
  generate: (data) => API.post('/drafting/generate', data),
  get: (projectId) => API.get(`/drafting/${projectId}`),
}

export const auditAPI = {
  review: (data) => API.post('/audit/review', data),
  get: (projectId) => API.get(`/audit/${projectId}`),
}

export const settingsAPI = {
  getProfile: () => API.get('/settings/profile'),
  updateProfile: (data) => API.put('/settings/profile', data),
  get: () => API.get('/settings/'),
  update: (data) => API.put('/settings/', data),
  getApiStatus: () => API.get('/settings/api-status'),
}

export const adminAPI = {
  // User management
  listUsers: () => API.get('/admin/users'),
  createUser: (data) => API.post('/admin/users', data),
  toggleUser: (id) => API.put(`/admin/users/${id}/toggle`),
  deleteUser: (id) => API.delete(`/admin/users/${id}`),
  changePassword: (id, newPassword) => API.put(`/admin/users/${id}/password`, { new_password: newPassword }),
  // API Key management
  getSettings: () => API.get('/admin/settings'),
  updateSettings: (data) => API.put('/admin/settings', data),
}

export const authAPI = {
  login: (username, password) => API.post('/auth/login', { username, password }),
  me: () => API.get('/auth/me'),
}

export const researchAPI = {
  collect: (data) => API.post('/research/collect', data),
  get: (projectId) => API.get(`/research/${projectId}`),
  clear: (projectId) => API.delete(`/research/${projectId}`),
}

export const analysisAPI = {
  analyze: (data) => API.post('/analysis/analyze', data),
  get: (projectId) => API.get(`/analysis/${projectId}`),
}

export default API
