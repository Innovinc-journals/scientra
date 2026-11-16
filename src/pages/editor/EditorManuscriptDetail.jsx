import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Download, FileText, MessageSquare, CheckCircle, AlertCircle } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { api } from '../../api/apiClient'
import { getStatusMeta, formatIsoDateTime } from '../../utils/manuscriptStatus'
import { toApiError } from '../../api/errors'

export default function EditorManuscriptDetail() {
  const { manuscriptId } = useParams()
  const [manuscript, setManuscript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const [decision, setDecision] = useState('REVISIONS_REQUESTED')
  const [remarks, setRemarks] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [downloadingVersion, setDownloadingVersion] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.editor.getManuscript(manuscriptId)
      setManuscript(data)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [manuscriptId])

  useEffect(() => {
    load()
  }, [load])

  const handleDownloadVersion = async (ver) => {
    setDownloadingVersion(ver)
    setError('')
    try {
      await api.editor.downloadVersion(manuscriptId, ver)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setDownloadingVersion(null)
    }
  }

  const handleDecisionSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    const trimmed = remarks.trim()
    if (trimmed.length < 10 || trimmed.length > 10000) {
      setError('Editorial remarks must be between 10 and 10,000 characters.')
      return
    }
    setSubmitting(true)
    try {
      await api.editor.submitDecision(manuscriptId, {
        decision,
        remarks: trimmed,
      })
      setRemarks('')
      setNotice(`Editorial decision (${decision}) recorded.`)
      await load()
    } catch (err) {
      const apiErr = toApiError(err)
      setError(apiErr.message)
      if (apiErr.status === 409) await load()
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="p-16 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!manuscript) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <p className="font-bold text-navy-950">{error || 'Manuscript unavailable'}</p>
        <Link to="/editor">
          <Button variant="outline">Back to Assigned Manuscripts</Button>
        </Link>
      </div>
    )
  }

  const meta = getStatusMeta(manuscript.status)
  const currentVersion = manuscript.current_version ?? 1
  const versions = Array.isArray(manuscript.versions) ? manuscript.versions : []
  const sourceVersions = versions.filter((v) => !v.kind || v.kind.toUpperCase() === 'SOURCE')
  const versionNumbers =
    sourceVersions.length > 0
      ? sourceVersions.map((v, i) => v.version_number ?? i + 1)
      : Array.from({ length: currentVersion }, (_, i) => i + 1)
  const remarksList = Array.isArray(manuscript.remarks) ? manuscript.remarks : []

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          to="/editor"
          className="text-sm font-semibold text-gray-600 hover:text-primary-600 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Assigned Manuscripts
        </Link>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => handleDownloadVersion(currentVersion)}
          disabled={downloadingVersion === currentVersion}
          className="gap-1.5"
        >
          <Download className="w-4 h-4" /> Download Current Source (v{currentVersion})
        </Button>
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      {/* Manuscript Overview */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge className={meta.badgeClass}>{meta.label}</Badge>
          <span className="font-mono text-xs text-gray-500">ID: {manuscript.id}</span>
          <span className="text-xs font-semibold bg-gray-100 text-navy-900 px-2.5 py-1 rounded">
            Current Source v{currentVersion}
          </span>
        </div>

        <h2 className="text-2xl font-bold text-navy-950">{manuscript.title}</h2>
        <p className="text-xs text-gray-500">
          Journal: <strong className="text-navy-900">{manuscript.journal_title || manuscript.journal_id}</strong>
        </p>

        {manuscript.abstract && (
          <div className="pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Abstract</h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{manuscript.abstract}</p>
          </div>
        )}

        {/* Compare Source Versions */}
        <div className="pt-4 border-t border-gray-100">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
            Download &amp; Compare Source Versions
          </h4>
          <div className="flex flex-wrap gap-2">
            {versionNumbers.map((ver) => (
              <Button
                key={ver}
                type="button"
                variant="outline"
                size="sm"
                disabled={downloadingVersion === ver}
                onClick={() => handleDownloadVersion(ver)}
                className="gap-1.5 text-xs"
              >
                <FileText className="w-3.5 h-3.5 text-primary-600" />
                {downloadingVersion === ver ? `Opening v${ver}...` : `Download Source v${ver}`}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Editorial Decision Form */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
        <h3 className="text-lg font-bold text-navy-950 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-primary-600" /> Submit Editorial Decision
        </h3>
        <form onSubmit={handleDecisionSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">Decision *</label>
            <select
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-navy-900"
            >
              <option value="REVISIONS_REQUESTED">REVISIONS_REQUESTED (ask author for revised version)</option>
              <option value="ACCEPTED">ACCEPTED (move manuscript into production &amp; proofing)</option>
              <option value="REJECTED">REJECTED (decline manuscript)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-900 mb-1.5">
              Editorial Remarks for Author * (10–10,000 characters)
            </label>
            <textarea
              rows={5}
              required
              minLength={10}
              maxLength={10000}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide detailed feedback, required revisions, or acceptance remarks for the author..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
            />
          </div>

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Submitting Decision...' : 'Record Editorial Decision'}
          </Button>
        </form>
      </div>

      {/* Remarks History */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
        <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary-600" /> Remarks &amp; Author Responses
        </h3>
        {remarksList.length === 0 ? (
          <p className="text-xs text-gray-500">No remarks recorded yet.</p>
        ) : (
          <ul className="space-y-3 text-xs">
            {remarksList.map((r, i) => (
              <li key={i} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                <div className="flex items-center justify-between text-gray-500">
                  <span className="font-bold text-navy-900">{r.author_role || r.role || 'Comment'}</span>
                  <span>{formatIsoDateTime(r.created_at)}</span>
                </div>
                <p className="text-gray-700 whitespace-pre-line">{r.message || r.remarks || r.text}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
