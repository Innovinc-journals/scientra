import React, { useCallback, useEffect, useState } from 'react'
import { DollarSign, Check, X, RefreshCw } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { api } from '../../api/apiClient'
import { formatIsoDateTime } from '../../utils/manuscriptStatus'
import { toApiError } from '../../api/errors'

export default function AdminApcWaivers() {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [page] = useState(1)
  const pageSize = 20
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [decidingId, setDecidingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.admin.listApcWaivers({ page, page_size: pageSize })
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

  const handleDecision = async (id, decision) => {
    setDecidingId(id)
    setError('')
    setNotice('')
    try {
      await api.admin.decideApcWaiver(id, decision)
      setNotice(`APC waiver request ${decision === 'approve' ? 'approved' : 'rejected'}.`)
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setDecidingId(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-950">APC Waiver Requests</h2>
          <p className="text-gray-500 text-sm mt-1">
            Review and approve or reject author Article Processing Charge waiver applications ({total}).
          </p>
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
            <DollarSign className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="font-semibold text-navy-950">No APC waiver requests found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {items.map((w) => {
              const st = (w.status || 'PENDING').toUpperCase()
              return (
                <div key={w.id} className="p-6 flex flex-col sm:flex-row justify-between items-start gap-4">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary-600">#{w.id}</span>
                      {w.manuscript_id && (
                        <span className="text-xs text-gray-500">Manuscript: {w.manuscript_id}</span>
                      )}
                      <Badge
                        className={
                          st === 'APPROVED'
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : st === 'REJECTED'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-amber-50 text-amber-700 border-amber-200'
                        }
                      >
                        {st}
                      </Badge>
                    </div>
                    <p className="text-sm text-navy-950 font-medium whitespace-pre-line">{w.reason}</p>
                    <p className="text-xs text-gray-400">{formatIsoDateTime(w.created_at)}</p>
                  </div>
                  {st === 'PENDING' && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        type="button"
                        size="sm"
                        disabled={decidingId === w.id}
                        onClick={() => handleDecision(w.id, 'approve')}
                        className="bg-green-600 hover:bg-green-700 text-white gap-1"
                      >
                        <Check className="w-4 h-4" /> Approve
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={decidingId === w.id}
                        onClick={() => handleDecision(w.id, 'reject')}
                        className="border-red-200 text-red-600 hover:bg-red-50 gap-1"
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                    </div>
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
