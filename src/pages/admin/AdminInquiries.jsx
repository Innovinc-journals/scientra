import React, { useCallback, useEffect, useState } from 'react'
import { MessageSquare, CheckCircle, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { api } from '../../api/apiClient'
import { formatIsoDateTime } from '../../utils/manuscriptStatus'
import { toApiError } from '../../api/errors'

export default function AdminInquiries() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [resolvingId, setResolvingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.admin.listInquiries({ page, page_size: pageSize })
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

  const handleResolve = async (id) => {
    setResolvingId(id)
    setError('')
    setNotice('')
    try {
      await api.admin.resolveInquiry(id)
      setNotice('Inquiry marked as resolved.')
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setResolvingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-950">Contact Inquiries</h2>
          <p className="text-gray-500 text-sm mt-1">Messages submitted through the public Contact page ({total}).</p>
        </div>
        <Button type="button" variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center space-y-2 text-gray-500">
            <MessageSquare className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-semibold text-navy-950">No inquiries found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((inq) => {
              const resolved = inq.status === 'RESOLVED' || inq.resolved === true
              return (
                <div key={inq.id} className="p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-navy-950 text-sm">
                        {[inq.first_name, inq.last_name].filter(Boolean).join(' ') || inq.name || 'Sender'}
                      </span>
                      <span className="text-xs text-gray-500">({inq.email})</span>
                      <Badge
                        className={
                          resolved
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {resolved ? 'RESOLVED' : inq.status || 'OPEN'}
                      </Badge>
                    </div>
                    <h4 className="font-semibold text-navy-900 text-sm">{inq.subject}</h4>
                    <p className="text-xs text-gray-600 whitespace-pre-line">{inq.message}</p>
                    <p className="text-[11px] text-gray-400">{formatIsoDateTime(inq.created_at)}</p>
                  </div>
                  {!resolved && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={resolvingId === inq.id}
                      onClick={() => handleResolve(inq.id)}
                      className="gap-1.5 shrink-0"
                    >
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      {resolvingId === inq.id ? 'Resolving...' : 'Mark Resolved'}
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
