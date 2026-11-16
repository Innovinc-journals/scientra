import React, { useCallback, useEffect, useState } from 'react'
import { Check, X, Eye, Clock, Search, Filter, RefreshCw, ExternalLink } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { motion, AnimatePresence } from 'framer-motion'
import { api } from '../../api/apiClient'
import { formatIsoDateTime } from '../../utils/manuscriptStatus'
import { toApiError } from '../../api/errors'

export default function AdminApplications() {
  const [applications, setApplications] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selectedApp, setSelectedApp] = useState(null)
  const [decidingId, setDecidingId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.admin.listApplications({
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        page,
        page_size: pageSize,
      })
      setApplications(res.items || [])
      setTotal(res.total ?? (res.items || []).length)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, page])

  useEffect(() => {
    load()
  }, [load])

  const handleOpenDetail = async (app) => {
    setSelectedApp(app)
    try {
      const full = await api.admin.getApplication(app.id)
      if (full) setSelectedApp(full)
    } catch {
      /* keep list item if detail call fails */
    }
  }

  const handleDecision = async (id, decision) => {
    setDecidingId(id)
    setError('')
    setNotice('')
    try {
      await api.admin.decideApplication(id, decision)
      setNotice(
        decision === 'approve'
          ? 'Application approved. A Create Password invitation email has been queued for the new editor.'
          : 'Application rejected.',
      )
      setSelectedApp(null)
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setDecidingId(null)
    }
  }

  const filteredApps = applications.filter((app) => {
    if (!searchTerm.trim()) return true
    const q = searchTerm.toLowerCase()
    return (
      (app.name || '').toLowerCase().includes(q) ||
      (app.institution || '').toLowerCase().includes(q) ||
      (app.email || '').toLowerCase().includes(q)
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-navy-950">Editor Applications</h2>
          <p className="text-gray-500 text-sm mt-1">
            Review prospective Editorial Board applications. Approving queues a password-setup invitation.
          </p>
        </div>
        <Button type="button" variant="outline" onClick={load} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-6 border-b border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by name, email, or institution..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm font-medium transition-colors"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
              <Filter className="w-4 h-4" /> Status:
            </div>
            <select
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm outline-none cursor-pointer"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="ALL">All Applications</option>
            </select>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-16 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="px-6 py-4 font-semibold">Applicant</th>
                  <th className="px-6 py-4 font-semibold">Expertise</th>
                  <th className="px-6 py-4 font-semibold">Date Applied</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredApps.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="px-6 py-12 text-center text-gray-500">
                      No applications found matching your criteria ({total} total).
                    </td>
                  </tr>
                ) : (
                  filteredApps.map((app) => {
                    const st = (app.status || 'PENDING').toUpperCase()
                    return (
                      <tr key={app.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="font-bold text-navy-950 text-sm">
                              {app.title ? `${app.title} ` : ''}
                              {app.name}
                            </span>
                            <span className="text-xs text-gray-500">
                              {app.institution} • {app.email}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-gray-700">{app.expertise}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-gray-500">
                            {formatIsoDateTime(app.created_at || app.date)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {st === 'PENDING' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200">
                              <Clock className="w-3 h-3" /> Pending
                            </span>
                          )}
                          {st === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold border border-green-200">
                              <Check className="w-3 h-3" /> Approved
                            </span>
                          )}
                          {st === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                              <X className="w-3 h-3" /> Rejected
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => handleOpenDetail(app)}
                              className="h-8 px-2 border-gray-200 text-gray-600"
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {st === 'PENDING' && (
                              <>
                                <Button
                                  type="button"
                                  onClick={() => handleDecision(app.id, 'approve')}
                                  disabled={decidingId === app.id}
                                  className="h-8 px-3 bg-green-500 hover:bg-green-600 text-white"
                                >
                                  <Check className="w-4 h-4 mr-1" /> Approve
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleDecision(app.id, 'reject')}
                                  disabled={decidingId === app.id}
                                  className="h-8 px-3 border-red-200 text-red-600 hover:bg-red-50"
                                >
                                  <X className="w-4 h-4 mr-1" /> Reject
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Application Detail Modal */}
      <AnimatePresence>
        {selectedApp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-navy-950/40 backdrop-blur-sm"
              onClick={() => setSelectedApp(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-navy-950">
                    {selectedApp.title ? `${selectedApp.title} ` : ''}
                    {selectedApp.name}
                  </h3>
                  <p className="text-xs text-gray-500">{selectedApp.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="p-1.5 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs font-bold uppercase text-gray-400 block">Institution</span>
                  <span className="text-navy-950 font-medium">{selectedApp.institution}</span>
                </div>
                <div>
                  <span className="text-xs font-bold uppercase text-gray-400 block">Expertise</span>
                  <span className="text-navy-950 font-medium">{selectedApp.expertise}</span>
                </div>
                {selectedApp.scholar_url && (
                  <div>
                    <span className="text-xs font-bold uppercase text-gray-400 block">Profile URL</span>
                    <a
                      href={selectedApp.scholar_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary-600 hover:underline inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      {selectedApp.scholar_url} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
                {selectedApp.cover_letter && (
                  <div>
                    <span className="text-xs font-bold uppercase text-gray-400 block mb-1">Cover Letter</span>
                    <p className="text-xs text-gray-700 bg-gray-50 p-3.5 rounded-xl border border-gray-100 whitespace-pre-line max-h-48 overflow-y-auto">
                      {selectedApp.cover_letter}
                    </p>
                  </div>
                )}
              </div>

              {(selectedApp.status || 'PENDING').toUpperCase() === 'PENDING' && (
                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleDecision(selectedApp.id, 'reject')}
                    disabled={decidingId === selectedApp.id}
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    Reject
                  </Button>
                  <Button
                    type="button"
                    onClick={() => handleDecision(selectedApp.id, 'approve')}
                    disabled={decidingId === selectedApp.id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    Approve &amp; Send Invite
                  </Button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}
