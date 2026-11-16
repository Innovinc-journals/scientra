import { http } from './http'
import { toApiError } from './errors'

function filenameFromDisposition(header, fallback = 'download') {
  if (!header || typeof header !== 'string') return fallback
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1].trim().replace(/^"(.*)"$/, '$1'))
    } catch {
      /* ignore */
    }
  }
  const plain = header.match(/filename=([^;]+)/i)
  if (plain?.[1]) return plain[1].trim().replace(/^"(.*)"$/, '$1')
  return fallback
}

// Implements the backend download contract for all screens:
//  - Calls the API with the Bearer token (via `http`).
//  - If the response is JSON `{ url, expires_in }` (S3 mode), opens the signed URL
//    directly without forwarding the API Authorization header.
//  - If binary (local mode), triggers a browser download (or opens PDF) from a Blob.
export async function downloadFromApi(path, { params, fallbackFilename = 'document.pdf', openInNewTab = false } = {}) {
  try {
    const res = await http.get(path, {
      params,
      responseType: 'blob',
    })
    const contentType = (res.headers?.['content-type'] || '').toLowerCase()

    if (contentType.includes('application/json')) {
      const text = await res.data.text()
      const data = JSON.parse(text)
      if (data?.url) {
        window.open(data.url, '_blank', 'noopener,noreferrer')
        return { mode: 'signed_url', url: data.url, expiresIn: data.expires_in }
      }
      throw new Error(data?.message || 'Download URL was not provided by the server.')
    }

    const blob = res.data instanceof Blob ? res.data : new Blob([res.data], { type: contentType || 'application/octet-stream' })
    const blobUrl = window.URL.createObjectURL(blob)
    const filename = filenameFromDisposition(res.headers?.['content-disposition'], fallbackFilename)

    if (openInNewTab && contentType.includes('pdf')) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer')
    } else {
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
    }
    setTimeout(() => window.URL.revokeObjectURL(blobUrl), 60_000)
    return { mode: 'blob', filename }
  } catch (err) {
    if (err?.response?.data instanceof Blob) {
      try {
        const text = await err.response.data.text()
        err.response.data = JSON.parse(text)
      } catch {
        /* leave as-is if not JSON */
      }
    }
    throw toApiError(err)
  }
}
