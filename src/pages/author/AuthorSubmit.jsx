import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { UploadCloud, CheckCircle, FileText, ArrowRight, X, Plus, Trash2, AlertCircle, Lock } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/apiClient'
import { useAuth } from '../../auth/AuthContext'
import { toApiError } from '../../api/errors'

const ARTICLE_TYPES = [
  'ORIGINAL RESEARCH',
  'REVIEW ARTICLE',
  'CLINICAL TRIAL',
  'CASE REPORT',
  'SHORT COMMUNICATION',
  'PERSPECTIVE',
]

function splitFullName(name = '') {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first_name: '', last_name: '' }
  if (parts.length === 1) return { first_name: parts[0], last_name: 'Author' }
  return {
    first_name: parts.slice(0, -1).join(' '),
    last_name: parts[parts.length - 1],
  }
}

export default function AuthorSubmit() {
  const { journalId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [journals, setJournals] = useState([])
  const [step, setStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    title: '',
    abstract: '',
    journalId: journalId || '',
    articleType: 'ORIGINAL RESEARCH',
    file: null,
  })

  const [coAuthors, setCoAuthors] = useState(() => {
    const { first_name, last_name } = splitFullName(user?.name || '')
    return [
      {
        first_name,
        last_name,
        email: user?.email || '',
        affiliation_name: user?.institution || '',
        orcid_id: '',
        is_corresponding: true,
      },
    ]
  })

  // Pre-fill first author from signed-in user once loaded
  useEffect(() => {
    if (!user) return
    setCoAuthors((prev) => {
      if (prev.length === 1 && !prev[0].email) {
        const { first_name, last_name } = splitFullName(user.name || '')
        return [
          {
            first_name,
            last_name,
            email: user.email || '',
            affiliation_name: user.institution || '',
            orcid_id: '',
            is_corresponding: true,
          },
        ]
      }
      return prev
    })
  }, [user])

  // Load journals from GET /journals for the journal picker
  useEffect(() => {
    let alive = true
    api.journals
      .getAll({ page_size: 100 })
      .then((list) => {
        if (alive) setJournals(list || [])
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [])

  const updateAuthor = (index, field, value) => {
    setCoAuthors((prev) =>
      prev.map((item, i) => {
        if (field === 'is_corresponding') {
          return { ...item, is_corresponding: i === index }
        }
        return i === index ? { ...item, [field]: value } : item
      }),
    )
  }

  const addAuthorRow = () => {
    if (coAuthors.length >= 100) return
    setCoAuthors((prev) => [
      ...prev,
      {
        first_name: '',
        last_name: '',
        email: '',
        affiliation_name: '',
        orcid_id: '',
        is_corresponding: false,
      },
    ])
  }

  const removeAuthorRow = (index) => {
    if (coAuthors.length <= 1) return
    setCoAuthors((prev) => {
      const next = prev.filter((_, i) => i !== index)
      if (!next.some((a) => a.is_corresponding) && next.length > 0) {
        next[0] = { ...next[0], is_corresponding: true }
      }
      return next
    })
  }

  const validateStep1 = () => {
    if (!formData.journalId) return 'Please select a target journal.'
    const t = formData.title.trim()
    if (t.length < 5 || t.length > 500) return 'Manuscript title must be between 5 and 500 characters.'
    const abs = formData.abstract.trim()
    if (abs.length < 20 || abs.length > 100000) return 'Abstract must be at least 20 characters.'
    if (coAuthors.length < 1 || coAuthors.length > 100) return 'Please include between 1 and 100 authors.'

    const emails = new Set()
    let correspondingCount = 0
    for (let i = 0; i < coAuthors.length; i += 1) {
      const a = coAuthors[i]
      if (!a.first_name.trim() || !a.last_name.trim() || !a.email.trim() || !a.affiliation_name.trim()) {
        return `Please complete first name, last name, email, and affiliation for Author #${i + 1}.`
      }
      const lower = a.email.trim().toLowerCase()
      if (emails.has(lower)) {
        return `Duplicate author email (${a.email.trim()}). Each author email must be unique.`
      }
      emails.add(lower)
      if (a.is_corresponding) correspondingCount += 1
    }
    if (correspondingCount !== 1) {
      return 'Exactly one author must be marked as the corresponding author.'
    }
    if (user?.email && !emails.has(user.email.trim().toLowerCase())) {
      return `The signed-in author's email (${user.email}) must be included in the authors list.`
    }
    return null
  }

  const handleNext = () => {
    setError(null)
    if (step === 1) {
      const problem = validateStep1()
      if (problem) {
        setError(problem)
        return
      }
    }
    if (step === 2) {
      if (!formData.file) {
        setError('Please upload your manuscript file (PDF, DOC, or DOCX up to 10 MiB).')
        return
      }
      if (formData.file.size > 10 * 1024 * 1024) {
        setError('File exceeds the 10 MiB maximum limit. Please upload a smaller file.')
        return
      }
    }
    setStep((s) => s + 1)
  }

  const handleBack = () => {
    setError(null)
    setStep((s) => s - 1)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (user?.email_verified === false) {
      setError('Verify your email before submitting.')
      return
    }
    const step1Problem = validateStep1()
    if (step1Problem) {
      setError(step1Problem)
      return
    }
    if (!formData.file) {
      setError('Please upload a manuscript file first.')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const normalizedAuthors = coAuthors.map((a) => ({
        first_name: a.first_name.trim(),
        last_name: a.last_name.trim(),
        email: a.email.trim(),
        affiliation_name: a.affiliation_name.trim(),
        orcid_id: a.orcid_id?.trim() ? a.orcid_id.trim() : null,
        is_corresponding: Boolean(a.is_corresponding),
      }))

      const multipart = new FormData()
      multipart.append('journal_id', formData.journalId)
      multipart.append('title', formData.title.trim())
      multipart.append('abstract', formData.abstract.trim())
      multipart.append('article_type', formData.articleType || 'ORIGINAL RESEARCH')
      multipart.append('co_authors', JSON.stringify(normalizedAuthors))
      multipart.append('file', formData.file)

      const res = await api.manuscripts.submit(multipart)
      const manuscriptId = res?.id
      if (manuscriptId) {
        navigate(`/dashboard/submissions/${encodeURIComponent(manuscriptId)}`, { replace: true })
      } else {
        navigate('/dashboard/submissions', { replace: true })
      }
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFileDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFormData({ ...formData, file: e.dataTransfer.files[0] })
    }
  }

  const removeFile = () => {
    setFormData({ ...formData, file: null })
  }

  if (authLoading) {
    return (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 text-center space-y-5">
          <div className="w-14 h-14 bg-primary-50 text-primary-600 rounded-full flex items-center justify-center mx-auto">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-bold text-navy-950">Sign in to Submit Your Manuscript</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Manuscript submissions are tracked under your verified Scientra Author account so you can follow screening, peer review, revisions, and proofs.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Link to="/login" state={{ from: location }}>
              <Button className="w-full sm:w-auto px-8 h-11 rounded-xl">Sign In</Button>
            </Link>
            <Link to="/register">
              <Button variant="outline" className="w-full sm:w-auto px-8 h-11 rounded-xl">
                Create Author Account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  const emailUnverified = user?.email_verified === false

  return (
    <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-navy-950">Submit New Manuscript</h2>
        <p className="text-gray-500 text-sm mt-1">Upload your research for screening and peer review.</p>
      </div>

      {emailUnverified && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 text-sm text-amber-800">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Please verify your email address ({user.email}) before submitting a manuscript.</span>
          </div>
          <Link
            to="/verify-email"
            className="text-xs font-bold text-amber-900 bg-white border border-amber-300 px-4 py-2 rounded-xl hover:bg-amber-100 transition-colors shrink-0"
          >
            Verify Email Now
          </Link>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-10">
        {/* Progress Bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 w-full h-1 bg-gray-100 -translate-y-1/2 z-0 rounded-full"></div>
            <div
              className="absolute left-0 top-1/2 h-1 bg-primary-500 -translate-y-1/2 z-0 transition-all duration-500 rounded-full"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            ></div>

            {[1, 2, 3].map((num) => (
              <div key={num} className="relative z-10 flex flex-col items-center gap-2">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-colors duration-300 ${
                    step >= num
                      ? 'bg-primary-500 text-white shadow-md shadow-primary-500/20'
                      : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {num < step ? <CheckCircle className="w-5 h-5" /> : num}
                </div>
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider hidden sm:block ${
                    step >= num ? 'text-navy-950' : 'text-gray-400'
                  }`}
                >
                  {num === 1 ? 'Details & Authors' : num === 2 ? 'Upload' : 'Review'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm flex items-center justify-between shadow-sm">
            <span className="font-medium">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form
          onSubmit={
            step === 3
              ? handleSubmit
              : (e) => {
                  e.preventDefault()
                  handleNext()
                }
          }
        >
          <AnimatePresence mode="wait">
            {/* Step 1: Details & Structured Co-Authors */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-navy-900 mb-1.5">Select Journal *</label>
                    <select
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm text-navy-900 appearance-none cursor-pointer"
                      value={formData.journalId}
                      onChange={(e) => setFormData({ ...formData, journalId: e.target.value })}
                    >
                      <option value="" disabled>
                        -- Select a Journal --
                      </option>
                      {journals.map((j) => (
                        <option key={j.id} value={j.id}>
                          {j.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-navy-900 mb-1.5">Article Type *</label>
                    <select
                      required
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm text-navy-900 appearance-none cursor-pointer"
                      value={formData.articleType}
                      onChange={(e) => setFormData({ ...formData, articleType: e.target.value })}
                    >
                      {ARTICLE_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy-900 mb-1.5">Manuscript Title *</label>
                  <input
                    type="text"
                    required
                    minLength={5}
                    maxLength={500}
                    placeholder="Enter the full title of the manuscript (5–500 characters)"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm font-medium text-navy-900"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-navy-900 mb-1.5">Abstract *</label>
                  <textarea
                    required
                    rows="5"
                    minLength={20}
                    placeholder="Paste the manuscript abstract here (minimum 20 characters)..."
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 outline-none text-sm text-navy-900 resize-none"
                    value={formData.abstract}
                    onChange={(e) => setFormData({ ...formData, abstract: e.target.value })}
                  ></textarea>
                </div>

                {/* Structured Authors List */}
                <div className="space-y-4 pt-2 border-t border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="block text-sm font-semibold text-navy-900">
                        Authors & Affiliations * ({coAuthors.length})
                      </label>
                      <p className="text-xs text-gray-500">
                        Your account email ({user?.email}) must be included. Select one corresponding author.
                      </p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={addAuthorRow} className="gap-1.5 shrink-0">
                      <Plus className="w-4 h-4" /> Add Co-Author
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {coAuthors.map((author, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-navy-900">
                            Author #{idx + 1}
                          </span>
                          <div className="flex items-center gap-4">
                            <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-700 cursor-pointer">
                              <input
                                type="radio"
                                name="corresponding_author"
                                checked={Boolean(author.is_corresponding)}
                                onChange={() => updateAuthor(idx, 'is_corresponding', true)}
                                className="text-primary-600 focus:ring-primary-500"
                              />
                              Corresponding Author
                            </label>
                            {coAuthors.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeAuthorRow(idx)}
                                className="text-red-500 hover:text-red-700 text-xs font-semibold inline-flex items-center gap-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" /> Remove
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          <input
                            type="text"
                            required
                            placeholder="First name *"
                            value={author.first_name}
                            onChange={(e) => updateAuthor(idx, 'first_name', e.target.value)}
                            className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-navy-900 outline-none focus:border-primary-500"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Last name *"
                            value={author.last_name}
                            onChange={(e) => updateAuthor(idx, 'last_name', e.target.value)}
                            className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-navy-900 outline-none focus:border-primary-500"
                          />
                          <input
                            type="email"
                            required
                            placeholder="Email address *"
                            value={author.email}
                            onChange={(e) => updateAuthor(idx, 'email', e.target.value)}
                            className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-navy-900 outline-none focus:border-primary-500"
                          />
                          <input
                            type="text"
                            required
                            placeholder="Institution / Affiliation *"
                            value={author.affiliation_name}
                            onChange={(e) => updateAuthor(idx, 'affiliation_name', e.target.value)}
                            className="sm:col-span-2 px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-navy-900 outline-none focus:border-primary-500"
                          />
                          <input
                            type="text"
                            placeholder="ORCID (optional, e.g. 0000-0002-...)"
                            value={author.orcid_id || ''}
                            onChange={(e) => updateAuthor(idx, 'orcid_id', e.target.value)}
                            className="px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm text-navy-900 outline-none focus:border-primary-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {/* Step 2: Upload */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div
                  className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center hover:bg-gray-50 hover:border-primary-400 transition-colors cursor-pointer group"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => document.getElementById('file-upload').click()}
                >
                  <input
                    type="file"
                    id="file-upload"
                    className="hidden"
                    accept=".pdf,.doc,.docx"
                    onChange={(e) => setFormData({ ...formData, file: e.target.files[0] })}
                  />

                  {!formData.file ? (
                    <>
                      <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud className="w-8 h-8" />
                      </div>
                      <p className="text-navy-900 font-semibold mb-1">Click to upload or drag and drop</p>
                      <p className="text-gray-500 text-xs">PDF, DOC, DOCX (Max 10 MiB)</p>
                    </>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-8 h-8" />
                      </div>
                      <p className="text-navy-900 font-bold text-sm max-w-[280px] truncate">{formData.file.name}</p>
                      <p className="text-gray-500 text-xs mt-1 mb-4">
                        {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
                        onClick={(e) => {
                          e.stopPropagation()
                          removeFile()
                        }}
                      >
                        Remove File <X className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 space-y-5 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="block text-gray-500 font-semibold text-xs mb-1 uppercase tracking-wider">
                        Target Journal
                      </span>
                      <p className="font-medium text-navy-900">
                        {journals.find((j) => j.id === formData.journalId)?.title || formData.journalId}
                      </p>
                    </div>
                    <div>
                      <span className="block text-gray-500 font-semibold text-xs mb-1 uppercase tracking-wider">
                        Article Type
                      </span>
                      <p className="font-medium text-navy-900">{formData.articleType}</p>
                    </div>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-semibold text-xs mb-1 uppercase tracking-wider">
                      Manuscript Title
                    </span>
                    <p className="font-medium text-navy-900">{formData.title}</p>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-semibold text-xs mb-1 uppercase tracking-wider">
                      Authors ({coAuthors.length})
                    </span>
                    <ul className="space-y-1 mt-1">
                      {coAuthors.map((a, i) => (
                        <li key={i} className="text-navy-900 font-medium text-xs">
                          {i + 1}. {a.first_name} {a.last_name} ({a.email}) — {a.affiliation_name}
                          {a.is_corresponding ? ' [Corresponding]' : ''}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <span className="block text-gray-500 font-semibold text-xs mb-1 uppercase tracking-wider">
                      Attached Source File
                    </span>
                    <div className="flex items-center gap-2 font-medium text-navy-900 mt-1">
                      <FileText className="w-4 h-4 text-primary-500" />
                      {formData.file ? formData.file.name : <span className="text-red-500">No file uploaded</span>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-10 pt-6 border-t border-gray-100">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                className="h-11 px-6 rounded-xl border-gray-200 text-gray-600 hover:bg-gray-50"
              >
                Back
              </Button>
            ) : (
              <div></div>
            )}

            {step < 3 ? (
              <Button type="submit" className="h-11 px-8 rounded-xl shadow-sm transition-all ml-auto">
                Continue <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="submit"
                className="h-11 px-8 rounded-xl bg-green-500 hover:bg-green-600 text-white shadow-sm transition-all"
                disabled={isSubmitting || !formData.file || emailUnverified}
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    Submit Manuscript <CheckCircle className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
