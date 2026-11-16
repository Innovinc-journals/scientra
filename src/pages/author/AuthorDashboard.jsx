import React, { useEffect, useState } from 'react'
import { FileText, Clock, CheckCircle, AlertCircle, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { api } from '../../api/apiClient'
import { useAuth } from '../../auth/AuthContext'
import { getStatusMeta, formatIsoDateTime, MANUSCRIPT_STATUS } from '../../utils/manuscriptStatus'
import { toApiError } from '../../api/errors'

export default function AuthorDashboard() {
  const { user } = useAuth()
  const [submissions, setSubmissions] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.manuscripts
      .mySubmissions({ page: 1, page_size: 20 })
      .then((res) => {
        if (!alive) return
        setSubmissions(res.items || [])
        setTotal(res.total ?? (res.items || []).length)
      })
      .catch((err) => {
        if (alive) setError(toApiError(err).message)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const underReviewCount = submissions.filter((m) =>
    [
      MANUSCRIPT_STATUS.SUBMITTED,
      MANUSCRIPT_STATUS.CORRECTIONS_REQUESTED,
      MANUSCRIPT_STATUS.ASSIGNED_TO_EDITOR,
      MANUSCRIPT_STATUS.REVISIONS_REQUESTED,
    ].includes(m.status),
  ).length

  const acceptedOrPublishedCount = submissions.filter((m) =>
    [MANUSCRIPT_STATUS.ACCEPTED, MANUSCRIPT_STATUS.PUBLISHED].includes(m.status),
  ).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-navy-950">Welcome back, {user?.name || 'Author'}!</h2>
          <p className="text-gray-500 text-sm mt-1">Here is a quick overview of your manuscript submissions.</p>
        </div>
        <Link to="/dashboard/submit">
          <Button className="shadow-sm" disabled={user?.email_verified === false}>
            Submit New Manuscript
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Submissions</p>
            <p className="text-2xl font-bold text-navy-950">{loading ? '—' : total}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active / In Review</p>
            <p className="text-2xl font-bold text-navy-950">{loading ? '—' : underReviewCount}</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Accepted / Published</p>
            <p className="text-2xl font-bold text-navy-950">{loading ? '—' : acceptedOrPublishedCount}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 flex items-center justify-between">
          <h3 className="font-bold text-navy-950">Recent Submissions</h3>
          <Link to="/dashboard/submissions" className="text-xs font-bold text-primary-600 hover:text-primary-700 inline-flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600 flex flex-col items-center gap-2">
            <AlertCircle className="w-6 h-6" />
            <span>{error}</span>
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <FileText className="w-10 h-10 text-gray-300 mx-auto" />
            <p className="text-sm font-semibold text-navy-950">No manuscripts submitted yet</p>
            <p className="text-xs text-gray-500">Start your first submission to track its editorial progress here.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {submissions.slice(0, 8).map((m) => {
              const meta = getStatusMeta(m.status)
              return (
                <div
                  key={m.id}
                  className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={meta.badgeClass}>{meta.label}</Badge>
                      <span className="text-xs font-mono text-gray-400">#{m.id}</span>
                      {m.current_version && (
                        <span className="text-xs text-gray-500 font-medium">Source v{m.current_version}</span>
                      )}
                      {m.proof_version > 0 && (
                        <span className="text-xs text-primary-700 bg-primary-50 px-2 py-0.5 rounded font-semibold">
                          Proof v{m.proof_version}
                        </span>
                      )}
                    </div>
                    <h4 className="font-bold text-navy-950">{m.title}</h4>
                    <p className="text-xs text-gray-500">
                      {m.journal_title || m.journal_id} • Updated {formatIsoDateTime(m.updated_at || m.created_at)}
                    </p>
                  </div>
                  <Link to={`/dashboard/submissions/${encodeURIComponent(m.id)}`} className="shrink-0">
                    <Button variant="outline" className="text-sm">
                      View Details
                    </Button>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
