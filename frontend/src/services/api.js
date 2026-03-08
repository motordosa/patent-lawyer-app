import axios from 'axios'

// 로컬: localhost:8000 / 프로덕션: VITE_API_URL 환경변수 (Vercel에서 설정)
const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 180000,  // 3분 — 파이프라인 LLM 순차 호출 지원
})


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

