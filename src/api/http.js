import axios from 'axios'
import { session } from '../auth/session'
import { toApiError } from './errors'

// VITE_API_BASE_URL is the API *origin* only; /api/v1 is appended exactly once here.
// Falls back to the public production API origin when unset (e.g. fresh Vercel deploy without env var).
const DEFAULT_API_ORIGIN = 'https://api.scientrajournals.org'
const ORIGIN = (import.meta.env.VITE_API_BASE_URL || DEFAULT_API_ORIGIN)
  .trim()
  .replace(/\/+$/, '')
  .replace(/\/api\/v1$/, '')

export const API_ORIGIN = ORIGIN
export const API_BASE_URL = `${ORIGIN}/api/v1`

export const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { Accept: 'application/json' },
})

// Plain client used only for the refresh call so it can never recurse into the interceptors.
const bare = axios.create({ baseURL: API_BASE_URL, timeout: 30000 })

http.interceptors.request.use((config) => {
  if (!config.skipAuth) {
    const token = session.getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  // FormData: let the browser set Content-Type with the multipart boundary.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    delete config.headers['Content-Type']
  }
  return config
})

// Only one refresh may be in flight: refresh tokens rotate.
let refreshPromise = null

export function refreshSession() {
  if (refreshPromise) return refreshPromise
  const refresh_token = session.getRefreshToken()
  if (!refresh_token) return Promise.reject(new Error('no_refresh_token'))

  refreshPromise = bare
    .post('/auth/refresh', { refresh_token })
    .then((res) => {
      session.setTokens(res.data) // replaces BOTH tokens
      return res.data
    })
    .catch((err) => {
      const status = err?.response?.status
      // Definitive rejection: the session is over. Network/5xx: keep the session and let the caller retry later.
      if (status && status >= 400 && status < 500) session.clear('refresh_failed')
      throw err
    })
    .finally(() => {
      refreshPromise = null
    })
  return refreshPromise
}

http.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    const status = error.response?.status
    if (status === 401 && original && !original.skipAuth && !original._retried && session.hasRefreshToken()) {
      original._retried = true
      try {
        await refreshSession()
        original.headers.Authorization = `Bearer ${session.getAccessToken()}`
        return http(original)
      } catch {
        // fall through to the original 401
      }
    }
    return Promise.reject(toApiError(error))
  },
)

// Helpers for building query strings: omit unset filters.
export function cleanParams(params = {}) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  )
}
