import { http } from './http'

// Public auth calls never send (or refresh) a bearer token.
const pub = { skipAuth: true }
const oauthCfg = { skipAuth: true, withCredentials: true }

export const authApi = {
  register: (body) => http.post('/auth/register', body, pub).then((r) => r.data),
  login: (body) => http.post('/auth/login', body, pub).then((r) => r.data),
  me: () => http.get('/auth/me').then((r) => r.data),
  logout: (refresh_token) => http.post('/auth/logout', { refresh_token }, pub),
  verifyEmail: (token) => http.post('/auth/verify-email', { token }, pub).then((r) => r.data),
  resendVerification: () => http.post('/auth/resend-verification').then((r) => r.data),
  forgotPassword: (email) => http.post('/auth/forgot-password', { email }, pub).then((r) => r.data),
  resetPassword: (body) => http.post('/auth/reset-password', body, pub).then((r) => r.data),
  oauthStart: (provider) =>
    http.get(`/auth/oauth/${encodeURIComponent(provider)}/start`, oauthCfg).then((r) => r.data),
  oauthCallback: (provider, body) =>
    http.post(`/auth/oauth/${encodeURIComponent(provider)}`, body, oauthCfg).then((r) => r.data),
}
