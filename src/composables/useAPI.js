import { ref } from 'vue'
import { useAuth } from './useAuth.js'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001'

let authHook = null

function getAuth() {
  if (!authHook) authHook = useAuth()
  return authHook
}

async function request(path, options = {}) {
  const { getToken } = getAuth()
  const token = getToken()

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }))
    throw new Error(err.error || `HTTP ${res.status}`)
  }
  return res.json()
}

export function useAPI() {
  const loading = ref(false)
  const error = ref('')

  return {
    loading,
    error,

    async fetchConcept(conceptName, threadId, parentSlug) {
      loading.value = true
      error.value = ''
      try {
        const data = await request('/api/ai/fetch-concept', {
          method: 'POST',
          body: JSON.stringify({ conceptName, threadId, parentSlug }),
        })
        return data
      } catch (e) {
        error.value = e.message
        throw e
      } finally {
        loading.value = false
      }
    },

    async getThreads(categoryId) {
      const params = categoryId ? `?category_id=${categoryId}` : ''
      return request(`/api/threads${params}`)
    },

    async getThread(id) {
      return request(`/api/threads/${id}`)
    },

    async createThread(rootTitle, categoryId) {
      return request('/api/threads', {
        method: 'POST',
        body: JSON.stringify({ rootTitle, categoryId }),
      })
    },

    async updateThread(id, updates) {
      return request(`/api/threads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      })
    },

    async deleteThread(id) {
      return request(`/api/threads/${id}`, { method: 'DELETE' })
    },

    async getConcepts(threadId) {
      return request(`/api/threads/${threadId}/concepts`)
    },

    async createConcept(threadId, data) {
      return request(`/api/threads/${threadId}/concepts`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
    },

    async getCategories() {
      return request('/api/categories')
    },

    async createCategory(name, color) {
      return request('/api/categories', {
        method: 'POST',
        body: JSON.stringify({ name, color }),
      })
    },

    async updateCategory(id, updates) {
      return request(`/api/categories/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
    },

    async deleteCategory(id) {
      return request(`/api/categories/${id}`, { method: 'DELETE' })
    },
  }
}
