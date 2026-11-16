import React, { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  FileText,
  CheckCircle,
  Clock,
  UploadCloud,
  Download,
  AlertCircle,
  MessageSquare,
  Users,
  DollarSign,
  ExternalLink,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { api } from '../../api/apiClient'
import {
  getStatusMeta,
  canAuthorUploadRevision,
  formatIsoDateTime,
  MANUSCRIPT_STATUS,
} from '../../utils/manuscriptStatus'
import { toApiError } from '../../api/errors'

export default function AuthorManuscriptDetail() {
  const { manuscriptId } = useParams()
  const [manuscript, setManuscript] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Revision form state (for CORRECTIONS_REQUESTED or REVISIONS_REQUESTED)
  const [authorResponse, setAuthorResponse] = useState('')
  const [revisionFile, setRevisionFile] = useState(null)
  const [submittingRevision, setSubmittingRevision] = useState(false)
  const [revisionError, setRevisionError] = useState('')

  // Proof review / approval state
  const [downloadingProof, setDownloadingProof] = useState(false)
  const [approvingProof, setApprovingProof] = useState(false)
  const [proofError, setProofError] = useState('')

  // APC waiver state (for ACCEPTED manuscripts)
  const [waiverReason, setWaiverReason] = useState('')
  const [submittingWaiver, setSubmittingWaiver] = useState(false)
  const [waiverError, setWaiverError] = useState('')
  const [waiverNotice, setWaiverNotice] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.manuscripts.getById(manuscriptId)
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

  const handleRevisionSubmit = async (e) => {
    e.preventDefault()
    setRevisionError('')
    setNotice('')
    const trimmed = authorResponse.trim()
    if (trimmed.length < 10) {
      setRevisionError('Please provide a response of at least 10 characters explaining your changes.')
      return
    }
    if (!revisionFile) {
      setRevisionError('Please select the revised manuscript file (PDF, DOC, or DOCX).')
      return
    }
    setSubmittingRevision(true)
    try {
      const form = new FormData()
      form.append('author_response', trimmed)
      form.append('file', revisionFile)
      await api.manuscripts.submitRevision(manuscriptId, form)
      setAuthorResponse('')
      setRevisionFile(null)
      setNotice('Revised manuscript uploaded successfully.')
      await load()
    } catch (err) {
      const apiErr = toApiError(err)
      setRevisionError(apiErr.message)
      if (apiErr.status === 409) await load()
    } finally {
      setSubmittingRevision(false)
    }
  }

  const handleDownloadProof = async () => {
    setProofError('')
    setDownloadingProof(true)
    try {
      await api.manuscripts.downloadProof(manuscriptId)
    } catch (err) {
      setProofError(toApiError(err).message)
    } finally {
      setDownloadingProof(false)
    }
  }

  const handleApproveProof = async () => {
    if (!manuscript?.proof_version) return
    setProofError('')
    setNotice('')
    setApprovingProof(true)
    try {
      await api.manuscripts.approveProof(manuscriptId, manuscript.proof_version)
      setNotice(`Proof version ${manuscript.proof_version} approved.`)
      await load()
    } catch (err) {
      const apiErr = toApiError(err)
      if (apiErr.status === 409) {
        await load()
        setProofError('A newer proof version is available. We reloaded the page — please review the latest proof before approving.')
      } else {
        setProofError(apiErr.message)
      }
    } finally {
      setApprovingProof(false)
    }
  }

  const handleRequestWaiver = async (e) => {
    e.preventDefault()
    setWaiverError('')
    setWaiverNotice('')
    const trimmed = waiverReason.trim()
    if (trimmed.length < 10) {
      setWaiverError('Please provide a reason of at least 10 characters.')
      return
    }
    setSubmittingWaiver(true)
    try {
      await api.manuscripts.requestApcWaiver(manuscriptId, trimmed)
      setWaiverReason('')
      setWaiverNotice('APC waiver request submitted for administrative review.')
      await load()
    } catch (err) {
      setWaiverError(toApiError(err).message)
    } finally {
      setSubmittingWaiver(false)
    }
  }

  if (loading) {
    return (
      <div className="p-16 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (error || !manuscript) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-500 mx-auto" />
        <h2 className="text-lg font-bold text-navy-950">{error || 'Manuscript unavailable'}</h2>
        <Link to="/dashboard/submissions">
          <Button variant="outline">Back to My Submissions</Button>
        </Link>
      </div>
    )
  }

  const meta = getStatusMeta(manuscript.status)
  const versions = Array.isArray(manuscript.versions) ? manuscript.versions : []
  const sourceVersions = versions.filter((v) => !v.kind || v.kind.toUpperCase() === 'SOURCE')
  const proofVersions = versions.filter((v) => v.kind && v.kind.toUpperCase() === 'PROOF')
  const remarks = Array.isArray(manuscript.remarks) ? manuscript.remarks : []
  const history = Array.isArray(manuscript.status_history) ? manuscript.status_history : []
  const productionTasks = Array.isArray(manuscript.production_tasks) ? manuscript.production_tasks : []
  const coAuthors = Array.isArray(manuscript.co_authors) ? manuscript.co_authors : []
  const isCurrentProofApproved =
    manuscript.proof_version > 0 && manuscript.approved_proof_version === manuscript.proof_version

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <Link
          to="/dashboard/submissions"
          className="text-sm font-semibold text-gray-600 hover:text-primary-600 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to My Submissions
        </Link>
        {manuscript.status === MANUSCRIPT_STATUS.PUBLISHED && manuscript.article_id && (
          <Link to={`/articles/${encodeURIComponent(manuscript.article_id)}`}>
            <Button size="sm" className="gap-1.5">
              Open Published Article <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>
        )}
      </div>

      <FormNotice message={notice} />

      {/* Header Summary Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge className={meta.badgeClass}>{meta.label}</Badge>
            <span className="text-xs font-mono text-gray-500">ID: {manuscript.id}</span>
            <span className="text-xs font-semibold text-navy-900 bg-gray-100 px-2.5 py-1 rounded-md">
              Source v{manuscript.current_version ?? 1}
            </span>
            {manuscript.proof_version > 0 && (
              <span className="text-xs font-semibold text-primary-700 bg-primary-50 px-2.5 py-1 rounded-md">
                Proof v{manuscript.proof_version}
                {isCurrentProofApproved ? ' (Approved)' : ''}
              </span>
            )}
          </div>
          {meta.nextAction && (
            <span className="text-xs font-medium text-gray-500">Next step: {meta.nextAction}</span>
          )}
        </div>

        <h2 className="text-2xl font-bold text-navy-950 leading-snug">{manuscript.title}</h2>
        <p className="text-xs text-gray-500">
          Journal: <strong className="text-navy-900">{manuscript.journal_title || manuscript.journal_id}</strong>
          {manuscript.article_type ? ` • ${manuscript.article_type}` : ''}
        </p>

        {manuscript.abstract && (
          <div className="pt-3 border-t border-gray-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1.5">Abstract</h4>
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{manuscript.abstract}</p>
          </div>
        )}
      </div>

      {/* Revision Upload Card (CORRECTIONS_REQUESTED or REVISIONS_REQUESTED) */}
      {canAuthorUploadRevision(manuscript.status) && (
        <div className="bg-white rounded-2xl border-2 border-amber-200 shadow-sm p-6 md:p-8 space-y-4">
          <div className="flex items-start gap-3">
            <UploadCloud className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-bold text-navy-950">Upload Revised Manuscript</h3>
              <p className="text-xs text-gray-600 mt-0.5">
                {manuscript.status === MANUSCRIPT_STATUS.CORRECTIONS_REQUESTED
                  ? 'Screening corrections were requested. Uploading a revised file returns your manuscript to Awaiting Screening.'
                  : 'Editor revisions were requested. Uploading a revised file returns your manuscript to your assigned editor.'}
              </p>
            </div>
          </div>

          <FormError message={revisionError} />

          <form onSubmit={handleRevisionSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1.5">
                Author Response / Summary of Changes * (10–10,000 characters)
              </label>
              <textarea
                required
                minLength={10}
                maxLength={10000}
                rows={4}
                value={authorResponse}
                onChange={(e) => setAuthorResponse(e.target.value)}
                placeholder="Describe how you addressed the screening or reviewer remarks..."
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm text-navy-900"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-navy-900 mb-1.5">
                Revised Source File * (PDF, DOC, DOCX up to 10 MiB)
              </label>
              <input
                type="file"
                required
                accept=".pdf,.doc,.docx"
                onChange={(e) => setRevisionFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
              />
            </div>

            <Button type="submit" disabled={submittingRevision}>
              {submittingRevision ? 'Uploading Revision...' : 'Submit Revised Version'}
            </Button>
          </form>
        </div>
      )}

      {/* Proof Review & Approval Card */}
      {manuscript.proof_version > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-navy-950">Galley Proof Review (v{manuscript.proof_version})</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {isCurrentProofApproved
                  ? `You have approved proof version ${manuscript.approved_proof_version}.`
                  : 'Download and inspect the typeset PDF proof, then approve it for publication.'}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleDownloadProof}
                disabled={downloadingProof}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                {downloadingProof ? 'Opening Proof...' : `Download Proof v${manuscript.proof_version} (PDF)`}
              </Button>
              {!isCurrentProofApproved && (
                <Button
                  type="button"
                  onClick={handleApproveProof}
                  disabled={approvingProof}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {approvingProof ? 'Approving...' : `Approve Proof v${manuscript.proof_version}`}
                </Button>
              )}
            </div>
          </div>
          <FormError message={proofError} />
        </div>
      )}

      {/* Authors & Separate Source / Proof Version Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <Users className="w-4 h-4 text-primary-600" /> Authors ({coAuthors.length})
          </h3>
          {coAuthors.length === 0 ? (
            <p className="text-xs text-gray-500">Author records recorded on submission.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-xs">
              {coAuthors.map((a, idx) => (
                <li key={idx} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <span className="font-bold text-navy-950">
                      {[a.first_name, a.last_name].filter(Boolean).join(' ') || a.name || a.email}
                    </span>
                    <div className="text-gray-500">{a.affiliation_name || a.affiliation}</div>
                  </div>
                  {a.is_corresponding && (
                    <Badge className="bg-primary-50 text-primary-700 border-primary-200">Corresponding</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-primary-600" /> Manuscript Source Versions
            </h3>
            {sourceVersions.length === 0 ? (
              <p className="text-xs text-gray-500">Current source version: v{manuscript.current_version ?? 1}</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-xs">
                {sourceVersions.map((v, idx) => (
                  <li key={idx} className="py-2 flex items-center justify-between">
                    <span className="font-semibold text-navy-900">Source v{v.version_number ?? idx + 1}</span>
                    <span className="text-gray-500">{formatIsoDateTime(v.created_at || v.uploaded_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="pt-3 border-t border-gray-100">
            <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-green-600" /> PDF Proof Versions
            </h3>
            {proofVersions.length === 0 && !manuscript.proof_version ? (
              <p className="text-xs text-gray-500">No PDF proofs uploaded yet.</p>
            ) : proofVersions.length === 0 ? (
              <p className="text-xs text-gray-600">Latest proof: v{manuscript.proof_version}</p>
            ) : (
              <ul className="divide-y divide-gray-100 text-xs">
                {proofVersions.map((v, idx) => (
                  <li key={idx} className="py-2 flex items-center justify-between">
                    <span className="font-semibold text-navy-900">
                      Proof v{v.version_number ?? idx + 1}
                      {manuscript.approved_proof_version === v.version_number ? ' (Approved)' : ''}
                    </span>
                    <span className="text-gray-500">{formatIsoDateTime(v.created_at || v.uploaded_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Editorial Remarks & Status Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary-600" /> Editorial & Review Remarks
          </h3>
          {remarks.length === 0 ? (
            <p className="text-xs text-gray-500">No remarks posted yet.</p>
          ) : (
            <ul className="space-y-3 text-xs">
              {remarks.map((r, idx) => (
                <li key={idx} className="p-3.5 rounded-xl bg-gray-50 border border-gray-100 space-y-1">
                  <div className="flex items-center justify-between text-gray-500">
                    <span className="font-bold text-navy-900">{r.author_role || r.role || r.stage || 'Editorial'}</span>
                    <span>{formatIsoDateTime(r.created_at)}</span>
                  </div>
                  <p className="text-gray-700 whitespace-pre-line">{r.message || r.remarks || r.note || r.text}</p>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
          <h3 className="text-sm font-bold text-navy-950 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-600" /> Status History & Production Tasks
          </h3>
          {history.length === 0 ? (
            <p className="text-xs text-gray-500">Submitted — awaiting next editorial transition.</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-xs">
              {history.map((h, idx) => {
                const st = getStatusMeta(h.to_status || h.status)
                return (
                  <li key={idx} className="py-2.5 flex items-center justify-between gap-2">
                    <span className="font-semibold text-navy-900">{st.label}</span>
                    <span className="text-gray-500">{formatIsoDateTime(h.created_at || h.changed_at)}</span>
                  </li>
                )
              })}
            </ul>
          )}

          {productionTasks.length > 0 && (
            <div className="pt-3 border-t border-gray-100">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Production Tasks</h4>
              <ul className="space-y-1.5 text-xs">
                {productionTasks.map((t, idx) => (
                  <li key={idx} className="flex items-center justify-between">
                    <span className="font-medium text-navy-900">{t.task || t.name}</span>
                    <Badge
                      className={
                        t.status === 'DONE'
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-gray-100 text-gray-600 border-gray-200'
                      }
                    >
                      {t.status || 'PENDING'}
                    </Badge>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* APC Waiver Request (only when ACCEPTED) */}
      {manuscript.status === MANUSCRIPT_STATUS.ACCEPTED && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-4">
          <div className="flex items-center gap-2.5">
            <DollarSign className="w-5 h-5 text-primary-600" />
            <div>
              <h3 className="text-base font-bold text-navy-950">Request APC Waiver</h3>
              <p className="text-xs text-gray-500">
                Accepted manuscripts may apply for an Article Processing Charge waiver if institutional funding is unavailable.
              </p>
            </div>
          </div>
          <FormError message={waiverError} />
          <FormNotice message={waiverNotice} />
          <form onSubmit={handleRequestWaiver} className="space-y-3">
            <textarea
              rows={3}
              required
              minLength={10}
              maxLength={10000}
              value={waiverReason}
              onChange={(e) => setWaiverReason(e.target.value)}
              placeholder="Explain the reason for requesting an APC waiver (minimum 10 characters)..."
              className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm text-navy-900"
            />
            <Button type="submit" variant="outline" size="sm" disabled={submittingWaiver}>
              {submittingWaiver ? 'Submitting...' : 'Submit APC Waiver Request'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
