// Normalised API error. The backend returns {code, message, details}; FastAPI validation
// can also return {detail: [{loc, msg}]}. Everything is mapped to one shape for the UI.

export class ApiError extends Error {
  constructor({ status = 0, code = 'error', message, details = null, retryAfter = null, requestId = null }) {
    super(message || 'Something went wrong. Please try again.')
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
    this.retryAfter = retryAfter
    this.requestId = requestId
  }

  // [{ field, message }] built from details.errors or FastAPI `detail`
  get fieldErrors() {
    const list = this.details?.errors
    if (!Array.isArray(list)) return []
    return list.map((e) => {
      const loc = Array.isArray(e.loc) ? e.loc : Array.isArray(e.location) ? e.location : []
      const field = [...loc].reverse().find((p) => typeof p === 'string' && p !== 'body') || null
      return { field, message: e.message || e.msg || 'Invalid value' }
    })
  }
}

const FRIENDLY = {
  0: 'Cannot reach the server. Check your connection and try again.',
  401: 'Your session has expired. Please sign in again.',
  403: 'You do not have access to this action.',
  404: 'This record is unavailable.',
  409: 'This record has changed. Please reload and try again.',
  413: 'The file is too large. Please upload a smaller file.',
  429: 'Too many attempts. Please wait a moment and try again.',
  503: 'The service is temporarily unavailable. Please try again shortly.',
}

export function toApiError(error) {
  if (error instanceof ApiError) return error
  const res = error?.response
  if (!res) {
    return new ApiError({ status: 0, code: 'network_error', message: FRIENDLY[0] })
  }
  const data = res.data && typeof res.data === 'object' ? res.data : {}
  let details = data.details ?? null
  if (!details && Array.isArray(data.detail)) {
    details = { errors: data.detail.map((d) => ({ loc: d.loc, message: d.msg })) }
  }
  const message =
    (typeof data.message === 'string' && data.message) ||
    (typeof data.detail === 'string' && data.detail) ||
    FRIENDLY[res.status] ||
    'Something went wrong. Please try again.'
  const retry = Number(res.headers?.['retry-after'])
  return new ApiError({
    status: res.status,
    code: data.code || 'error',
    message,
    details,
    retryAfter: Number.isFinite(retry) ? retry : null,
    requestId: res.headers?.['x-request-id'] || null,
  })
}

// Convert an ApiError's field errors into { fieldName: message } using an optional alias map
// (API field name -> form field name).
export function fieldErrorMap(error, aliases = {}) {
  const map = {}
  if (!(error instanceof ApiError)) return map
  for (const { field, message } of error.fieldErrors) {
    if (!field) continue
    const key = aliases[field] || field
    if (!map[key]) map[key] = message
  }
  return map
}
