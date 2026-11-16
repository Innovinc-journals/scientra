import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Download,
  CheckCircle,
  AlertCircle,
  ShieldCheck,
  UserPlus,
  UploadCloud,
  FileText,
  ExternalLink,
  RefreshCw,
} from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { api } from '../../api/apiClient'
import { useAuth } from '../../auth/AuthContext'
import { ROLES } from '../../auth/roles'
import {
  getStatusMeta,
  MANUSCRIPT_STATUS,
} from '../../utils/manuscriptStatus'
import { toApiError } from '../../api/errors'

const CHECK_TYPES = ['PLAGIARISM', 'DUPLICATE', 'FORMATTING']
const EDITABLE_PRODUCTION_TASKS = ['TYPESETTING', 'PROOFREADING', 'FORMATTING_CHECK']

export default function AdminManuscriptDetail() {
  const { manuscriptId } = useParams()
  const { user } = useAuth()
  const isSuperAdmin = user?.role === ROLES.SUPER_ADMIN

  const [manuscript, setManuscript] = useState(null)
  const [employees, setEmployees] = useState([]) // populated only for SUPER_ADMIN
  const [doiState, setDoiState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Claim / Employee assignment state
  const [claiming, setClaiming] = useState(false)
  const [assignStage, setAssignStage] = useState('SCREENING')
  const [assignEmployeeId, setAssignEmployeeId] = useState('')
  const [assignNote, setAssignNote] = useState('')
  const [assigningEmployee, setAssigningEmployee] = useState(false)

  // Screening check state
  const [checkForm, setCheckForm] = useState({
    check_type: 'PLAGIARISM',
    result: 'PASS',
    similarity_score: '',
    notes: '',
  })
  const [savingCheck, setSavingCheck] = useState(false)

  // Screening decision state
  const [decisionForm, setDecisionForm] = useState({
    outcome: 'PASS',
    editor_id: '',
    message: '',
  })
  const [submittingScreeningDecision, setSubmittingScreeningDecision] = useState(false)

  // Separate Editor assignment state
  const [reassignEditorId, setReassignEditorId] = useState('')
  const [reassignEditorNote, setReassignEditorNote] = useState('')
  const [reassigningEditor, setReassigningEditor] = useState(false)

  // Super Admin editorial override state
  const [overrideDecision, setOverrideDecision] = useState('ACCEPTED')
  const [overrideRemarks, setOverrideRemarks] = useState('')
  const [submittingOverride, setSubmittingOverride] = useState(false)

  // Production / Proof / DOI / Publish state
  const [proofFile, setProofFile] = useState(null)
  const [uploadingProof, setUploadingProof] = useState(false)
  const [taskNotes, setTaskNotes] = useState({})
  const [completingTask, setCompletingTask] = useState(null)
  const [registeringDoi, setRegisteringDoi] = useState(false)
  const [pollingDoi, setPollingDoi] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [publishedArticleId, setPublishedArticleId] = useState(null)
  const pollTimerRef = useRef(null)
  const pollCountRef = useRef(0)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await api.admin.getManuscript(manuscriptId)
      setManuscript(data)
      if (data?.article_id) setPublishedArticleId(data.article_id)
      if (data?.status === MANUSCRIPT_STATUS.ACCEPTED || data?.status === MANUSCRIPT_STATUS.PUBLISHED) {
        api.admin
          .getDoiStatus(manuscriptId)
          .then((d) => setDoiState(d))
          .catch(() => {})
      }
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setLoading(false)
    }
  }, [manuscriptId])

  useEffect(() => {
    load()
  }, [load])

  // Super Admin only: load employees for candidate dropdowns (STAFF and EDITOR).
  // Never call GET /admin/employees from a STAFF session (per handoff contract).
  useEffect(() => {
    if (!isSuperAdmin) return undefined
    let alive = true
    api.admin
      .listEmployees({ page_size: 100 })
      .then((res) => {
        if (alive) setEmployees(res.items || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [isSuperAdmin])

  // Stop DOI polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  const startDoiPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    pollCountRef.current = 0
    setPollingDoi(true)
    pollTimerRef.current = setInterval(async () => {
      pollCountRef.current += 1
      try {
        const st = await api.admin.getDoiStatus(manuscriptId)
        setDoiState(st)
        const status = st?.status || st?.doi_status
        if (status === 'REGISTERED' || status === 'FAILED' || pollCountRef.current >= 20) {
          clearInterval(pollTimerRef.current)
          pollTimerRef.current = null
          setPollingDoi(false)
          if (status === 'REGISTERED') load()
        }
      } catch {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
        setPollingDoi(false)
      }
    }, 4000)
  }, [manuscriptId, load])

  const handleClaim = async () => {
    setClaiming(true)
    setError('')
    setNotice('')
    try {
      await api.admin.claimManuscript(manuscriptId)
      setNotice('Manuscript claimed for screening.')
      await load()
    } catch (err) {
      const apiErr = toApiError(err)
      if (apiErr.status === 409) {
        setError('Ownership changed — another staff member claimed this manuscript.')
        await load()
      } else {
        setError(apiErr.message)
      }
    } finally {
      setClaiming(false)
    }
  }

  const handleAssignEmployee = async (e) => {
    e.preventDefault()
    if (!assignEmployeeId.trim()) {
      setError('Select or enter a staff user ID.')
      return
    }
    if (assignNote.trim().length < 10) {
      setError('Assignment note must be at least 10 characters.')
      return
    }
    setAssigningEmployee(true)
    setError('')
    setNotice('')
    try {
      await api.admin.assignEmployee(manuscriptId, {
        stage: assignStage,
        employee_id: assignEmployeeId.trim(),
        note: assignNote.trim(),
      })
      setAssignNote('')
      setNotice(`Assigned employee for ${assignStage}.`)
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setAssigningEmployee(false)
    }
  }

  const handleRecordCheck = async (e) => {
    e.preventDefault()
    setSavingCheck(true)
    setError('')
    setNotice('')
    try {
      const payload = {
        check_type: checkForm.check_type,
        result: checkForm.result,
        similarity_score:
          checkForm.similarity_score !== '' && checkForm.similarity_score !== null
            ? Number(checkForm.similarity_score)
            : null,
        notes: checkForm.notes.trim() || null,
      }
      await api.admin.recordScreeningCheck(manuscriptId, payload)
      setCheckForm((prev) => ({ ...prev, similarity_score: '', notes: '' }))
      setNotice(`Recorded ${payload.check_type} check (${payload.result}).`)
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setSavingCheck(false)
    }
  }

  const handleScreeningDecision = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (decisionForm.outcome === 'PASS' && !decisionForm.editor_id.trim()) {
      setError('Passing screening requires an eligible Editor ID.')
      return
    }
    if (decisionForm.outcome !== 'PASS' && decisionForm.message.trim().length < 10) {
      setError('Non-pass screening decisions require a message of at least 10 characters.')
      return
    }
    setSubmittingScreeningDecision(true)
    try {
      const body = {
        outcome: decisionForm.outcome,
        ...(decisionForm.outcome === 'PASS' ? { editor_id: decisionForm.editor_id.trim() } : {}),
        message: decisionForm.message.trim(),
      }
      await api.admin.submitScreeningDecision(manuscriptId, body)
      setDecisionForm((prev) => ({ ...prev, message: '' }))
      setNotice(`Screening decision (${decisionForm.outcome}) submitted.`)
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setSubmittingScreeningDecision(false)
    }
  }

  const handleAssignEditor = async (e) => {
    e.preventDefault()
    if (!reassignEditorId.trim()) {
      setError('Please provide an Editor ID.')
      return
    }
    setReassigningEditor(true)
    setError('')
    setNotice('')
    try {
      await api.admin.assignEditor(manuscriptId, {
        editor_id: reassignEditorId.trim(),
        note: reassignEditorNote.trim(),
      })
      setReassignEditorNote('')
      setNotice('Editor assigned.')
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setReassigningEditor(false)
    }
  }

  const handleOverrideDecision = async (e) => {
    e.preventDefault()
    if (overrideRemarks.trim().length < 10) {
      setError('Decision remarks must be at least 10 characters.')
      return
    }
    setSubmittingOverride(true)
    setError('')
    setNotice('')
    try {
      await api.admin.overrideDecision(manuscriptId, {
        decision: overrideDecision,
        remarks: overrideRemarks.trim(),
      })
      setOverrideRemarks('')
      setNotice(`Editorial decision overridden to ${overrideDecision}.`)
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setSubmittingOverride(false)
    }
  }

  const handleUploadProof = async (e) => {
    e.preventDefault()
    if (!proofFile) {
      setError('Select a PDF proof file to upload.')
      return
    }
    if (!proofFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Proof uploads must be PDF files, even if the author submitted a DOCX.')
      return
    }
    setUploadingProof(true)
    setError('')
    setNotice('')
    try {
      const res = await api.admin.uploadProof(manuscriptId, proofFile)
      setProofFile(null)
      setNotice(`Uploaded PDF proof version ${res?.proof_version || ''}. Author approval and proof checks have been reset.`)
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setUploadingProof(false)
    }
  }

  const handleCompleteTask = async (taskName) => {
    setCompletingTask(taskName)
    setError('')
    setNotice('')
    try {
      await api.admin.updateProductionTask(manuscriptId, taskName, {
        status: 'DONE',
        notes: (taskNotes[taskName] || 'Checked the current PDF proof.').trim(),
      })
      setNotice(`Production task ${taskName} marked as DONE.`)
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setCompletingTask(null)
    }
  }

  const handleRegisterDoi = async () => {
    setRegisteringDoi(true)
    setError('')
    setNotice('')
    try {
      const rec = await api.admin.registerDoi(manuscriptId)
      setDoiState(rec)
      setNotice('DOI registration queued.')
      startDoiPolling()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setRegisteringDoi(false)
    }
  }

  const handlePublish = async () => {
    setPublishing(true)
    setError('')
    setNotice('')
    try {
      const article = await api.admin.publishManuscript(manuscriptId)
      if (article?.id) setPublishedArticleId(article.id)
      setNotice('Manuscript published! Public article created.')
      await load()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setPublishing(false)
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
        <Link to="/admin/manuscripts">
          <Button variant="outline">Back to Queue</Button>
        </Link>
      </div>
    )
  }

  const meta = getStatusMeta(manuscript.status)
  const currentVersion = manuscript.current_version ?? 1
  const checks = Array.isArray(manuscript.screening_checks) ? manuscript.screening_checks : []

  // Latest check record for each check_type on the current source version
  const latestCheckByType = {}
  for (const c of checks) {
    if (c.version_number && c.version_number !== currentVersion) continue
    latestCheckByType[c.check_type] = c
  }
  const allThreeChecksPassed = CHECK_TYPES.every((t) => latestCheckByType[t]?.result === 'PASS')

  const staffCandidates = employees.filter(
    (e) => e.role === ROLES.STAFF && (e.status === 'ACTIVE' || !e.status) && e.email_verified !== false,
  )
  const editorCandidates = employees.filter(
    (e) => e.role === ROLES.EDITOR && (e.status === 'ACTIVE' || !e.status) && e.email_verified !== false,
  )

  const doiStatusValue = doiState?.status || doiState?.doi_status || manuscript.doi_status || 'NOT_STARTED'
  const doiIdentifier = doiState?.doi || manuscript.doi || ''
  const isSandboxDoi = typeof doiIdentifier === 'string' && doiIdentifier.startsWith('sandbox:')
  const proofFrozen = doiStatusValue === 'PENDING' || doiStatusValue === 'REGISTERED'

  const versions = Array.isArray(manuscript.versions) ? manuscript.versions : []
  const sourceVersions = versions.filter((v) => !v.kind || v.kind.toUpperCase() === 'SOURCE')
  const productionTasks = Array.isArray(manuscript.production_tasks) ? manuscript.production_tasks : []

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/admin/manuscripts"
          className="text-sm font-semibold text-gray-600 hover:text-primary-600 inline-flex items-center gap-1.5"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Manuscripts
        </Link>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={load} className="gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => api.admin.downloadManuscript(manuscript.id, currentVersion)}
            className="gap-1.5"
          >
            <Download className="w-3.5 h-3.5" /> Download Source (v{currentVersion})
          </Button>
          {(publishedArticleId || manuscript.article_id) && (
            <Link to={`/articles/${encodeURIComponent(publishedArticleId || manuscript.article_id)}`}>
              <Button size="sm" className="gap-1.5">
                View Public Article <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      {/* Manuscript Summary */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <Badge className={meta.badgeClass}>{meta.label}</Badge>
            <span className="font-mono text-xs text-gray-500">ID: {manuscript.id}</span>
            <span className="text-xs font-semibold bg-gray-100 text-navy-900 px-2.5 py-1 rounded">
              Source v{currentVersion}
            </span>
            <span className="text-xs font-semibold bg-primary-50 text-primary-700 px-2.5 py-1 rounded">
              Proof v{manuscript.proof_version ?? 0}
              {manuscript.approved_proof_version ? ` (Approved v${manuscript.approved_proof_version})` : ''}
            </span>
          </div>

          {!manuscript.screening_employee_id && manuscript.status === MANUSCRIPT_STATUS.SUBMITTED && (
            <Button type="button" size="sm" onClick={handleClaim} disabled={claiming} className="gap-1.5">
              <UserPlus className="w-4 h-4" />
              {claiming ? 'Claiming...' : 'Claim for Screening'}
            </Button>
          )}
        </div>

        <h2 className="text-xl font-bold text-navy-950">{manuscript.title}</h2>
        <div className="text-xs text-gray-500 flex flex-wrap gap-4">
          <span>Journal: <strong className="text-navy-900">{manuscript.journal_title || manuscript.journal_id}</strong></span>
          <span>Screening Owner: <strong className="text-navy-900">{manuscript.screening_employee_id || 'Unassigned'}</strong></span>
          <span>Production Owner: <strong className="text-navy-900">{manuscript.production_employee_id || 'Unassigned'}</strong></span>
          {manuscript.editor_id && (
            <span>Assigned Editor: <strong className="text-navy-900">{manuscript.editor_id}</strong></span>
          )}
        </div>

        {manuscript.abstract && (
          <p className="text-sm text-gray-700 pt-2 border-t border-gray-100 whitespace-pre-line">
            {manuscript.abstract}
          </p>
        )}

        {sourceVersions.length > 0 && (
          <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Source Versions:</span>
            {sourceVersions.map((v, i) => {
              const ver = v.version_number ?? i + 1
              return (
                <Button
                  key={ver}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => api.admin.downloadManuscript(manuscript.id, ver)}
                  className="h-7 text-xs gap-1"
                >
                  <FileText className="w-3 h-3" /> v{ver}
                </Button>
              )
            })}
          </div>
        )}
      </div>

      {/* Screening Checks & Screening Decision */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-navy-950 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-primary-600" /> Screening Checks (Source v{currentVersion})
            </h3>
            <Badge
              className={
                allThreeChecksPassed
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }
            >
              {allThreeChecksPassed ? 'All 3 Checks Passed' : 'Checks Incomplete'}
            </Badge>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {CHECK_TYPES.map((type) => {
              const rec = latestCheckByType[type]
              return (
                <div key={type} className="p-3 rounded-xl bg-gray-50 border border-gray-200 text-xs space-y-1">
                  <div className="font-bold text-navy-900">{type}</div>
                  {rec ? (
                    <>
                      <span
                        className={`inline-block font-bold ${
                          rec.result === 'PASS' ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {rec.result}
                      </span>
                      {rec.similarity_score != null && (
                        <div className="text-gray-500">Similarity: {rec.similarity_score}%</div>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-400">Not recorded</span>
                  )}
                </div>
              )
            })}
          </div>

          <form onSubmit={handleRecordCheck} className="space-y-3 pt-2 border-t border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <select
                value={checkForm.check_type}
                onChange={(e) => setCheckForm({ ...checkForm, check_type: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-navy-900"
              >
                {CHECK_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>

              <select
                value={checkForm.result}
                onChange={(e) => setCheckForm({ ...checkForm, result: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-navy-900"
              >
                <option value="PASS">PASS</option>
                <option value="FAIL">FAIL</option>
              </select>

              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                placeholder="Similarity % (0–100)"
                value={checkForm.similarity_score}
                onChange={(e) => setCheckForm({ ...checkForm, similarity_score: e.target.value })}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900"
              />
            </div>

            <input
              type="text"
              placeholder="Check notes (e.g. Manually checked the current source version)"
              value={checkForm.notes}
              onChange={(e) => setCheckForm({ ...checkForm, notes: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900"
            />

            <Button type="submit" size="sm" disabled={savingCheck}>
              {savingCheck ? 'Recording...' : 'Record Screening Check'}
            </Button>
          </form>
        </div>

        {/* Screening Decision & Editor Assignment */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <h3 className="text-base font-bold text-navy-950">Screening Decision &amp; Editor Assignment</h3>
          <form onSubmit={handleScreeningDecision} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Outcome</label>
              <select
                value={decisionForm.outcome}
                onChange={(e) => setDecisionForm({ ...decisionForm, outcome: e.target.value })}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-navy-900"
              >
                <option value="PASS">PASS &amp; Assign Editor (requires all 3 checks PASS)</option>
                <option value="REQUEST_CORRECTIONS">REQUEST_CORRECTIONS (return to author)</option>
                <option value="REJECT">REJECT (desk reject)</option>
              </select>
            </div>

            {decisionForm.outcome === 'PASS' && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-gray-600">Assign Eligible Editor ID *</label>
                {isSuperAdmin && editorCandidates.length > 0 && (
                  <select
                    value={decisionForm.editor_id}
                    onChange={(e) => setDecisionForm({ ...decisionForm, editor_id: e.target.value })}
                    className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900 mb-1.5"
                  >
                    <option value="">-- Select from active verified Editors --</option>
                    {editorCandidates.map((ed) => (
                      <option key={ed.id} value={ed.id}>
                        {ed.name} ({ed.email}) — {ed.id}
                      </option>
                    ))}
                  </select>
                )}
                <input
                  type="text"
                  required
                  placeholder="Enter Editor User ID"
                  value={decisionForm.editor_id}
                  onChange={(e) => setDecisionForm({ ...decisionForm, editor_id: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900 font-mono"
                />
                {!isSuperAdmin && (
                  <p className="text-[11px] text-gray-400">
                    Enter the operator-provided Editor ID (or ask a Super Admin to assign an editor).
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Message / Remarks {decisionForm.outcome !== 'PASS' ? '* (min 10 chars)' : ''}
              </label>
              <textarea
                rows={3}
                value={decisionForm.message}
                onChange={(e) => setDecisionForm({ ...decisionForm, message: e.target.value })}
                placeholder={
                  decisionForm.outcome === 'PASS'
                    ? 'All checks passed on the current source version.'
                    : 'Explain the required formatting corrections or rejection reason (min 10 characters)...'
                }
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900"
              />
            </div>

            <Button
              type="submit"
              size="sm"
              disabled={submittingScreeningDecision || (decisionForm.outcome === 'PASS' && !allThreeChecksPassed)}
            >
              {submittingScreeningDecision ? 'Submitting...' : 'Submit Screening Decision'}
            </Button>
          </form>

          {/* Separate Assign / Reassign Editor */}
          <form onSubmit={handleAssignEditor} className="pt-4 border-t border-gray-100 space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Assign / Reassign Editor Separately
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <input
                type="text"
                placeholder="Editor User ID *"
                value={reassignEditorId}
                onChange={(e) => setReassignEditorId(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono text-navy-900"
              />
              <input
                type="text"
                placeholder="Note (e.g. Reassigning due to availability)"
                value={reassignEditorNote}
                onChange={(e) => setReassignEditorNote(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900"
              />
            </div>
            <Button type="submit" variant="outline" size="sm" disabled={reassigningEditor}>
              {reassigningEditor ? 'Assigning...' : 'Assign Editor'}
            </Button>
          </form>
        </div>
      </div>

      {/* Production, Galley Proof, Tasks, DOI & Publish */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-lg font-bold text-navy-950">Production, Proofing &amp; DOI Registration</h3>
            <p className="text-xs text-gray-500">
              Upload PDF proofs, complete production tasks, register DOI, and publish when ready.
            </p>
          </div>
          <Badge className="bg-gray-100 text-gray-700 border-gray-200">
            DOI Status: {doiStatusValue}
          </Badge>
        </div>

        {/* Upload PDF Proof */}
        <form onSubmit={handleUploadProof} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-navy-950 flex items-center gap-2">
              <UploadCloud className="w-4 h-4 text-primary-600" /> Upload Galley Proof (PDF only)
            </span>
            {proofFrozen && (
              <span className="text-xs font-semibold text-amber-700">
                Proof uploads are frozen after DOI registration starts.
              </span>
            )}
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <input
              type="file"
              accept=".pdf,application/pdf"
              disabled={proofFrozen || uploadingProof}
              onChange={(e) => setProofFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-2 file:px-3.5 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-primary-50 file:text-primary-700"
            />
            <Button type="submit" size="sm" disabled={proofFrozen || uploadingProof || !proofFile} className="shrink-0">
              {uploadingProof ? 'Uploading PDF...' : 'Upload Proof PDF'}
            </Button>
          </div>
        </form>

        {/* Production Tasks */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">Production Tasks</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {EDITABLE_PRODUCTION_TASKS.map((taskName) => {
              const existing = productionTasks.find((t) => (t.task || t.name) === taskName)
              const isDone = existing?.status === 'DONE'
              return (
                <div key={taskName} className="p-4 rounded-xl border border-gray-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-navy-950">{taskName}</span>
                    <Badge
                      className={
                        isDone
                          ? 'bg-green-50 text-green-700 border-green-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }
                    >
                      {existing?.status || 'PENDING'}
                    </Badge>
                  </div>
                  <input
                    type="text"
                    placeholder="Task notes..."
                    value={taskNotes[taskName] || ''}
                    onChange={(e) => setTaskNotes({ ...taskNotes, [taskName]: e.target.value })}
                    className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs text-navy-900"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={completingTask === taskName}
                    onClick={() => handleCompleteTask(taskName)}
                    className="w-full h-8 text-xs"
                  >
                    {completingTask === taskName ? 'Saving...' : 'Mark DONE'}
                  </Button>
                </div>
              )
            })}
          </div>

          <div className="flex flex-wrap gap-4 text-xs text-gray-600 pt-2">
            <span>
              <strong>AUTHOR_FINAL_APPROVAL:</strong>{' '}
              {manuscript.proof_version > 0 && manuscript.approved_proof_version === manuscript.proof_version
                ? `DONE (v${manuscript.approved_proof_version})`
                : 'Awaiting author approval of current proof'}
            </span>
            <span>
              <strong>DOI_REGISTRATION:</strong> {doiStatusValue}
              {doiIdentifier ? ` (${doiIdentifier})` : ''}
            </span>
          </div>
        </div>

        {/* DOI Registration & Publish Controls */}
        <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRegisterDoi}
              disabled={registeringDoi || pollingDoi || doiStatusValue === 'REGISTERED'}
            >
              {registeringDoi
                ? 'Queueing DOI...'
                : pollingDoi
                ? 'Polling DOI Status...'
                : 'Register DOI'}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                api.admin
                  .getDoiStatus(manuscriptId)
                  .then((d) => setDoiState(d))
                  .catch((err) => setError(toApiError(err).message))
              }
            >
              Check DOI Status
            </Button>
          </div>

          <div className="flex flex-col sm:items-end gap-1">
            <Button
              type="button"
              size="sm"
              onClick={handlePublish}
              disabled={publishing || doiStatusValue !== 'REGISTERED' || isSandboxDoi}
              className="bg-green-600 hover:bg-green-700 text-white gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              {publishing ? 'Publishing...' : 'Publish Article'}
            </Button>
            {(doiStatusValue !== 'REGISTERED' || isSandboxDoi) && (
              <span className="text-[11px] text-amber-700 font-medium">
                Live DOI registration is pending. Publish activates once a live Crossref DOI is REGISTERED.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Super Admin Controls: Employee Assignment & Editorial Decision Override */}
      {isSuperAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <form
            onSubmit={handleAssignEmployee}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3"
          >
            <h3 className="text-base font-bold text-navy-950">Super Admin: Assign / Reassign Staff Owner</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <select
                value={assignStage}
                onChange={(e) => setAssignStage(e.target.value)}
                className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-navy-900"
              >
                <option value="SCREENING">Stage: SCREENING</option>
                <option value="PRODUCTION">Stage: PRODUCTION</option>
              </select>

              {staffCandidates.length > 0 ? (
                <select
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900"
                >
                  <option value="">-- Select Staff Member --</option>
                  {staffCandidates.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name} ({st.email})
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Staff User ID *"
                  value={assignEmployeeId}
                  onChange={(e) => setAssignEmployeeId(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-mono text-navy-900"
                />
              )}
            </div>
            <input
              type="text"
              required
              minLength={10}
              placeholder="Assignment note (min 10 characters) *"
              value={assignNote}
              onChange={(e) => setAssignNote(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900"
            />
            <Button type="submit" size="sm" disabled={assigningEmployee}>
              {assigningEmployee ? 'Assigning...' : 'Assign Staff Member'}
            </Button>
          </form>

          <form
            onSubmit={handleOverrideDecision}
            className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-3"
          >
            <h3 className="text-base font-bold text-navy-950">Super Admin: Editorial Decision Override</h3>
            <select
              value={overrideDecision}
              onChange={(e) => setOverrideDecision(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs font-semibold text-navy-900"
            >
              <option value="REVISIONS_REQUESTED">REVISIONS_REQUESTED</option>
              <option value="ACCEPTED">ACCEPTED</option>
              <option value="REJECTED">REJECTED</option>
            </select>
            <textarea
              rows={2}
              required
              minLength={10}
              placeholder="Decision remarks (min 10 characters) *"
              value={overrideRemarks}
              onChange={(e) => setOverrideRemarks(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900"
            />
            <Button type="submit" variant="outline" size="sm" disabled={submittingOverride}>
              {submittingOverride ? 'Applying Override...' : 'Apply Decision Override'}
            </Button>
          </form>
        </div>
      )}
    </div>
  )
}
