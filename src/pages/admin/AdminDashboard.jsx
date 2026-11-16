import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FileText,
  Clock,
  CheckCircle,
  Users,
  ShieldCheck,
  Layers,
  MessageSquare,
  DollarSign,
  AlertCircle,
  ArrowRight,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { api } from '../../api/apiClient'
import { useAuth } from '../../auth/AuthContext'
import { ROLES } from '../../auth/roles'
import { toApiError } from '../../api/errors'

function fmtCounter(value) {
  if (value === null || value === undefined) return 'Unavailable'
  if (typeof value === 'number') return value.toLocaleString()
  return String(value)
}

export default function AdminDashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    api.admin
      .dashboard()
      .then((data) => {
        if (alive) setMetrics(data || {})
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

  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN

  const statEntries = metrics
    ? Object.entries(metrics).filter(([, v]) => typeof v !== 'object' || v === null)
    : []

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div>
          <h2 className="text-2xl font-bold text-navy-950">Welcome, {user?.name || 'Team Member'}</h2>
          <p className="text-sm text-gray-500 mt-1">
            Role: <strong className="text-navy-900">{user?.role}</strong> • Editorial &amp; Publishing Operations
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/admin/manuscripts">
            <Button>Screening Queue</Button>
          </Link>
          <Link to="/admin/production">
            <Button variant="outline">Production Queue</Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-white rounded-2xl border border-red-200 p-6 flex items-center gap-3 text-sm text-red-700">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {statEntries.length > 0 ? (
            statEntries.map(([key, value]) => (
              <div key={key} className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-gray-400">
                  {key.replace(/_/g, ' ')}
                </p>
                <p className="text-2xl font-bold text-navy-950 mt-2">{fmtCounter(value)}</p>
              </div>
            ))
          ) : (
            <>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Manuscripts</p>
                  <p className="text-xl font-bold text-navy-950">Active Queue</p>
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 font-medium">Average Turnaround</p>
                  <p className="text-xl font-bold text-navy-950">Unavailable</p>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Quick Workspaces Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link
          to="/admin/manuscripts"
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-primary-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-bold text-navy-950">Screening &amp; Manuscripts</h3>
          <p className="text-xs text-gray-500 mt-1">
            Claim new submissions, record plagiarism/duplicate/formatting checks, and assign editors.
          </p>
        </Link>

        <Link
          to="/admin/production"
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-primary-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-green-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-bold text-navy-950">Production &amp; Proofs</h3>
          <p className="text-xs text-gray-500 mt-1">
            Upload PDF galley proofs, complete production tasks, and manage DOI &amp; publication.
          </p>
        </Link>

        <Link
          to="/admin/apc-waivers"
          className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-primary-400 transition-all group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <DollarSign className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
          </div>
          <h3 className="font-bold text-navy-950">APC Waiver Requests</h3>
          <p className="text-xs text-gray-500 mt-1">Review and approve or reject author APC waiver requests.</p>
        </Link>

        {isSuperAdmin && (
          <>
            <Link
              to="/admin/employees"
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-primary-400 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-navy-950">Employees &amp; Editors</h3>
              <p className="text-xs text-gray-500 mt-1">Invite Staff, Editors, and Super Admins and manage status.</p>
            </Link>

            <Link
              to="/admin/applications"
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-primary-400 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-navy-950">Editor Applications</h3>
              <p className="text-xs text-gray-500 mt-1">Approve or reject prospective editorial board applications.</p>
            </Link>

            <Link
              to="/admin/inquiries"
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-primary-400 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-navy-950">Contact Inquiries</h3>
              <p className="text-xs text-gray-500 mt-1">Review and resolve reader and author inquiries.</p>
            </Link>

            <Link
              to="/admin/catalog"
              className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:border-primary-400 transition-all group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-primary-600 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-bold text-navy-950">Categories &amp; Journals</h3>
              <p className="text-xs text-gray-500 mt-1">Create new academic domains and ISSN-registered journals.</p>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
