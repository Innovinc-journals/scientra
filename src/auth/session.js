// Token/session store.
//  - access token: memory only (never persisted)
//  - refresh token: sessionStorage by default, localStorage when "remember me" is ticked
// Tokens must never be placed in URLs, logs or analytics.

const RT_KEY = 'scientra.rt'

let accessToken = null
const listeners = new Set()

function readRefresh() {
  try {
    return window.localStorage.getItem(RT_KEY) || window.sessionStorage.getItem(RT_KEY) || null
  } catch {
    return null
  }
}

function writeRefresh(token, remember) {
  try {
    window.localStorage.removeItem(RT_KEY)
    window.sessionStorage.removeItem(RT_KEY)
    if (!token) return
    ;(remember ? window.localStorage : window.sessionStorage).setItem(RT_KEY, token)
  } catch {
    /* storage unavailable: session lives in memory only */
  }
}

function isRemembered() {
  try {
    return Boolean(window.localStorage.getItem(RT_KEY))
  } catch {
    return false
  }
}

export const session = {
  getAccessToken: () => accessToken,
  getRefreshToken: readRefresh,
  hasRefreshToken: () => Boolean(readRefresh()),

  // Store a token pair. `remember` is only passed on login; refresh rotation keeps the same storage.
  setTokens({ access_token, refresh_token }, remember) {
    accessToken = access_token || null
    writeRefresh(refresh_token, remember === undefined ? isRemembered() : remember)
  },

  clear(reason = 'cleared') {
    accessToken = null
    writeRefresh(null)
    listeners.forEach((fn) => fn(reason))
  },

  // Notified when the session is cleared (e.g. refresh failed). Returns an unsubscribe function.
  onClear(fn) {
    listeners.add(fn)
    return () => listeners.delete(fn)
  },
}
