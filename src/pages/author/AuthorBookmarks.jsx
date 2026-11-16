import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bookmark, Trash2, AlertCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { api } from '../../api/apiClient'
import { toApiError } from '../../api/errors'

export default function AuthorBookmarks() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.bookmarks.getAll({ page: 1, page_size: 50 })
      setItems(res.items || [])
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRemove = async (articleId) => {
    try {
      await api.bookmarks.remove(articleId)
      setItems((prev) => prev.filter((a) => String(a.id) !== String(articleId)))
    } catch (err) {
      setError(toApiError(err).message)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-navy-950">Saved Bookmarks</h2>
        <p className="text-gray-500 text-sm mt-1">Articles you have bookmarked for quick reference.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-12 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-red-500 mx-auto" />
            <p className="text-sm text-red-600">{error}</p>
            <Button type="button" variant="outline" onClick={load}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center space-y-3">
            <Bookmark className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-bold text-navy-950">No saved bookmarks yet</p>
            <p className="text-xs text-gray-500">Click the bookmark icon on any published article to save it here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((article) => (
              <div key={article.id} className="p-6 flex items-center justify-between gap-4 hover:bg-gray-50">
                <div>
                  <Link
                    to={`/articles/${encodeURIComponent(article.id)}`}
                    className="font-bold text-navy-950 hover:text-primary-600 transition-colors"
                  >
                    {article.title}
                  </Link>
                  <p className="text-xs text-gray-500 mt-1">
                    {article.journalTitle} {article.authors?.length ? `• ${article.authors.join(', ')}` : ''}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleRemove(article.id)}
                  className="text-red-600 border-red-200 hover:bg-red-50 shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
