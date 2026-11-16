import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileText, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { FormError } from '../../components/auth/AuthCard'
import { api } from '../../api/apiClient'
import { getStatusMeta, formatIsoDateTime } from '../../utils/manuscriptStatus'
import { toApiError } from '../../api/errors'

export default function EditorManuscripts() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.editor.listManuscripts({ page, page_size: pageSize })
      setItems(res.items || [])
      setTotal(res.total ?? (res.items || []).length)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => {
    load()
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-950">Assigned Manuscripts</h2>
          <p className="text-gray-500 text-sm mt-1">
            Manuscripts assigned to you for peer review and editorial decision ({total}).
          </p>
        </div>
        <Button type="button" variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Queue
        </Button>
      </div>

      <FormError message={error} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center space-y-2 text-gray-500">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-base font-medium text-gray-900">No manuscripts currently assigned to you</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="py-4 px-6 font-semibold">Manuscript</th>
                    <th className="py-4 px-6 font-semibold">Journal</th>
                    <th className="py-4 px-6 font-semibold">Current Version</th>
                    <th className="py-4 px-6 font-semibold">Status</th>
                    <th className="py-4 px-6 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {items.map((m) => {
                    const meta = getStatusMeta(m.status)
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-6 max-w-md">
                          <div className="font-mono text-xs font-bold text-primary-600 mb-1">{m.id}</div>
                          <div className="font-bold text-navy-950 line-clamp-2">{m.title}</div>
                          <div className="text-xs text-gray-400 mt-1">
                            Updated {formatIsoDateTime(m.updated_at || m.created_at)}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-700">{m.journal_title || m.journal_id}</td>
                        <td className="py-4 px-6 text-xs font-semibold text-navy-900">
                          Source v{m.current_version ?? 1}
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={meta.badgeClass}>{meta.label}</Badge>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <Link to={`/editor/manuscripts/${encodeURIComponent(m.id)}`}>
                            <Button size="sm">Review &amp; Decide</Button>
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                <span>
                  Page {page} of {totalPages} ({total} total)
                </span>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
