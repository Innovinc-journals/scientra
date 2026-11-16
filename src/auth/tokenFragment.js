// One-time tokens from email links arrive in the URL fragment (#token=...).
// Read once, keep in memory, and remove the fragment from the address bar so it is not
// kept in history, screenshots or shared links.

let held = null // { path, token }

export function takeFragmentToken(path) {
  const hash = window.location.hash
  if (hash && hash.length > 1) {
    const token = new URLSearchParams(hash.slice(1)).get('token')
    if (token) {
      held = { path, token }
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
  }
  return held && held.path === path ? held.token : null
}

export function clearFragmentToken() {
  held = null
}
