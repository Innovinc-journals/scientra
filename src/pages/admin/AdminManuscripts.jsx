import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, FileText, Download, RefreshCw, UserPlus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { api } from '../../api/apiClient'
import {
  getStatusMeta,
  formatIsoDateTime,
  MANUSCRIPT_STATUS,
} from '../../utils/manuscriptStatus'
import { toApiError } from '../../api/errors'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: MANUSCRIPT_STATUS.SUBMITTED, label: 'Awaiting screening (SUBMITTED)' },
  { value: MANUSCRIPT_STATUS.CORRECTIONS_REQUESTED, label: 'Screening corrections requested' },
  { value: MANUSCRIPT_STATUS.ASSIGNED_TO_EDITOR, label: 'With editor (ASSIGNED_TO_EDITOR)' },
  { value: MANUSCRIPT_STATUS.REVISIONS_REQUESTED, label: 'Editor revisions requested' },
  { value: MANUSCRIPT_STATUS.ACCEPTED, label: 'Accepted, in production' },
  { value: MANUSCRIPT_STATUS.PUBLISHED, label: 'Published' },
  { value: MANUSCRIPT_STATUS.REJECTED, label: 'Rejected' },
]

export default function AdminManuscripts() {
  const [assignment, setAssignment] = useState('unassigned') // unassigned | mine | all
  const [statusFilter, setStatusFilter] = useState('SUBMITTED')
  const [stageFilter, setStageFilter] = useState('SCREENING') // SCREENING | PRODUCTION
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [claimingId, setClaimingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.admin.listManuscripts({
        status: statusFilter || undefined,
        q: searchTerm.trim() || undefined,
        employee_assignment: assignment,
        employee_stage: stageFilter,
        page,
        page_size: pageSize,
      })
      setItems(res.items || [])
      setTotal(res.total ?? (res.items || []).length)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [assignment, statusFilter, stageFilter, searchTerm, page])

  useEffect(() => {
    load()
  }, [load])

  const handleClaim = async (manuscriptId) => {
    setClaimingId(manuscriptId)
    setError('')
    setNotice('')
    try {
      await api.admin.claimManuscript(manuscriptId)
      setNotice(`Manuscript ${manuscriptId} claimed into your screening queue.`)
      await load()
    } catch (err) {
      const apiErr = toApiError(err)
      if (apiErr.status === 409) {
        setError('Ownership changed — another staff member claimed this manuscript. Queue refreshed.')
        await load()
      } else {
        setError(apiErr.message)
      }
    } finally {
      setClaimingId(null)
    }
  }

  const handleDownload = async (manuscriptId, version) => {
    setError('')
    try {
      await api.admin.downloadManuscript(manuscriptId, version)
    } catch (err) {
      setError(toApiError(err).message)
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-950">Manuscripts &amp; Screening Queue</h2>
          <p className="text-gray-500 text-sm mt-1">
            Claim new submissions, perform screening checks, and manage editorial workflow.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh Queue
        </Button>
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Assignment Tabs + Filters */}
        <div className="p-6 border-b border-gray-200 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex bg-gray-100 p-1 rounded-xl">
              {[
                { key: 'unassigned', label: 'Unclaimed Queue' },
                { key: 'mine', label: 'My Queue' },
                { key: 'all', label: 'All Manuscripts' },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setAssignment(tab.key)
                    if (tab.key === 'unassigned') setStatusFilter(MANUSCRIPT_STATUS.SUBMITTED)
                    setPage(1)
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    assignment === tab.key
                      ? 'bg-white text-navy-950 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <select
                value={stageFilter}
                onChange={(e) => {
                  setStageFilter(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-navy-900 outline-none"
              >
                <option value="SCREENING">Stage: Screening</option>
                <option value="PRODUCTION">Stage: Production</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-navy-900 outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by title or tracking ID..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                setPage(1)
              }}
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm font-medium transition-colors"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-16 text-center space-y-2 text-gray-500">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-base font-medium text-gray-900">No manuscripts in this view</p>
            <p className="text-xs">Try switching between Unclaimed, My Queue, and All Manuscripts or adjusting filters.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 text-xs uppercase tracking-wider">
                    <th className="py-4 px-6 font-semibold">Manuscript Details</th>
                    <th className="py-4 px-6 font-semibold">Journal</th>
                    <th className="py-4 px-6 font-semibold">Versions</th>
                    <th className="py-4 px-6 font-semibold">Status</th>
                    <th className="py-4 px-6 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {items.map((m) => {
                    const meta = getStatusMeta(m.status)
                    const canClaim = m.status === MANUSCRIPT_STATUS.SUBMITTED && !m.screening_employee_id
                    return (
                      <tr key={m.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="py-4 px-6 max-w-md">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-xs font-bold text-primary-600">{m.id}</span>
                            {m.article_type && (
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                                {m.article_type}
                              </span>
                            )}
                          </div>
                          <div className="font-bold text-navy-950 line-clamp-2 mb-1">{m.title}</div>
                          <div className="text-xs text-gray-400">
                            Updated {formatIsoDateTime(m.updated_at || m.created_at)}
                          </div>
                        </td>
                        <td className="py-4 px-6 font-medium text-gray-700">{m.journal_title || m.journal_id}</td>
                        <td className="py-4 px-6 text-xs text-gray-600 space-y-1">
                          <div>Source v{m.current_version ?? 1}</div>
                          {m.proof_version > 0 && <div>Proof v{m.proof_version}</div>}
                        </td>
                        <td className="py-4 px-6">
                          <Badge className={meta.badgeClass}>{meta.label}</Badge>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {canClaim && (
                              <Button
                                type="button"
                                size="sm"
                                disabled={claimingId === m.id}
                                onClick={() => handleClaim(m.id)}
                                className="gap-1.5"
                              >
                                <UserPlus className="w-3.5 h-3.5" />
                                {claimingId === m.id ? 'Claiming...' : 'Claim'}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => handleDownload(m.id, m.current_version)}
                              title="Download Current Source"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Link to={`/admin/manuscripts/${encodeURIComponent(m.id)}`}>
                              <Button variant="outline" size="sm">
                                Open
                              </Button>
                            </Link>
                          </div>
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
