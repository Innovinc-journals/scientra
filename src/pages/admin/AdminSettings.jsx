import React, { useEffect, useState } from 'react'
import { Settings, FileText } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { api } from '../../api/apiClient'
import { toApiError } from '../../api/errors'

const POLICY_SLUGS = [
  { slug: 'editorial-policy', label: 'Editorial Policy' },
  { slug: 'open-access-statement', label: 'Open Access Statement' },
  { slug: 'copyright-statement', label: 'Copyright Statement' },
  { slug: 'privacy-policy', label: 'Privacy Policy' },
  { slug: 'terms-of-service', label: 'Terms of Service' },
]

export default function AdminSettings() {
  // Only contact_directory, site_metadata and publishing_information are accepted top-level keys
  const [siteMetadata, setSiteMetadata] = useState({ title: 'Scientra', tagline: '' })
  const [contactDirectory, setContactDirectory] = useState({ support_email: 'support@scientrajournals.org', phone: '', address: '' })
  const [publishingInfo, setPublishingInfo] = useState({ publisher_name: 'Scientra Press', license: 'CC BY 4.0' })
  const [loading, setLoading] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Policy Editor state
  const [existingPolicySlugs, setExistingPolicySlugs] = useState(null)
  const [policySlug, setPolicySlug] = useState('editorial-policy')
  const [policyTitle, setPolicyTitle] = useState('Editorial Policy')
  const [policyMarkdown, setPolicyMarkdown] = useState('')
  const [savingPolicy, setSavingPolicy] = useState(false)

  useEffect(() => {
    let alive = true
    Promise.all([api.admin.getSettings(), api.policies.getAll({ page_size: 100 })])
      .then(([data, policiesList]) => {
        if (!alive) return
        if (data && typeof data === 'object') {
          if (data.site_metadata && typeof data.site_metadata === 'object') {
            setSiteMetadata((prev) => ({ ...prev, ...data.site_metadata }))
          }
          if (data.contact_directory && typeof data.contact_directory === 'object') {
            setContactDirectory((prev) => ({ ...prev, ...data.contact_directory }))
          }
          if (data.publishing_information && typeof data.publishing_information === 'object') {
            setPublishingInfo((prev) => ({ ...prev, ...data.publishing_information }))
          }
        }
        const slugs = Array.isArray(policiesList) ? policiesList.map((p) => p.slug).filter(Boolean) : []
        setExistingPolicySlugs(slugs)
      })
      .catch(() => {
        if (alive) setExistingPolicySlugs([])
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (existingPolicySlugs === null) return undefined
    const defaultTitle = POLICY_SLUGS.find((p) => p.slug === policySlug)?.label || policySlug
    if (!existingPolicySlugs.includes(policySlug)) {
      setPolicyTitle(defaultTitle)
      setPolicyMarkdown('')
      return undefined
    }
    let alive = true
    api.policies
      .getBySlug(policySlug)
      .then((data) => {
        if (!alive) return
        if (data) {
          setPolicyTitle(data.title || defaultTitle)
          setPolicyMarkdown(data.content_markdown || data.content || '')
        } else {
          setPolicyTitle(defaultTitle)
          setPolicyMarkdown('')
        }
      })
      .catch(() => {})
    return () => {
      alive = false
    }
  }, [policySlug, existingPolicySlugs])

  const handleSaveSettings = async (e) => {
    e.preventDefault()
    setSavingSettings(true)
    setError('')
    setNotice('')
    try {
      await api.admin.updateSettings({
        site_metadata: siteMetadata,
        contact_directory: contactDirectory,
        publishing_information: publishingInfo,
      })
      setNotice('Site settings saved.')
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setSavingSettings(false)
    }
  }

  const handleSavePolicy = async (e) => {
    e.preventDefault()
    if (!policyTitle.trim() || !policyMarkdown.trim()) {
      setError('Policy title and Markdown content are required.')
      return
    }
    setSavingPolicy(true)
    setError('')
    setNotice('')
    try {
      await api.admin.updatePolicy(policySlug, {
        title: policyTitle.trim(),
        content_markdown: policyMarkdown,
      })
      setExistingPolicySlugs((prev) =>
        Array.isArray(prev) && !prev.includes(policySlug) ? [...prev, policySlug] : prev,
      )
      setNotice(`Saved policy "${policyTitle.trim()}" (/policies/${policySlug}).`)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setSavingPolicy(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-navy-950">Site Settings &amp; Policy Editor</h2>
        <p className="text-gray-500 text-sm mt-1">
          Configure public site metadata, contact directory, publishing information, and Markdown policies.
        </p>
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      {/* Site Settings Form */}
      <form onSubmit={handleSaveSettings} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-6">
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <Settings className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-bold text-navy-950">Platform Configuration</h3>
        </div>

        {loading ? (
          <div className="py-8 flex justify-center">
            <div className="w-6 h-6 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">site_metadata</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Site Title</label>
                  <input
                    type="text"
                    value={siteMetadata.title || ''}
                    onChange={(e) => setSiteMetadata({ ...siteMetadata, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={siteMetadata.tagline || ''}
                    onChange={(e) => setSiteMetadata({ ...siteMetadata, tagline: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">contact_directory</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Support Email</label>
                  <input
                    type="email"
                    value={contactDirectory.support_email || ''}
                    onChange={(e) => setContactDirectory({ ...contactDirectory, support_email: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Phone</label>
                  <input
                    type="text"
                    value={contactDirectory.phone || ''}
                    onChange={(e) => setContactDirectory({ ...contactDirectory, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Address</label>
                  <input
                    type="text"
                    value={contactDirectory.address || ''}
                    onChange={(e) => setContactDirectory({ ...contactDirectory, address: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
                  />
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">publishing_information</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Publisher Name</label>
                  <input
                    type="text"
                    value={publishingInfo.publisher_name || ''}
                    onChange={(e) => setPublishingInfo({ ...publishingInfo, publisher_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Default License</label>
                  <input
                    type="text"
                    value={publishingInfo.license || ''}
                    onChange={(e) => setPublishingInfo({ ...publishingInfo, license: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
                  />
                </div>
              </div>
            </div>

            <Button type="submit" disabled={savingSettings}>
              {savingSettings ? 'Saving Settings...' : 'Save Site Settings'}
            </Button>
          </div>
        )}
      </form>

      {/* Policy Markdown Editor */}
      <form onSubmit={handleSavePolicy} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-8 space-y-5">
        <div className="flex items-center gap-2.5 pb-3 border-b border-gray-100">
          <FileText className="w-5 h-5 text-primary-600" />
          <h3 className="text-lg font-bold text-navy-950">Policy Document Editor</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Policy Slug</label>
            <select
              value={policySlug}
              onChange={(e) => setPolicySlug(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-medium text-navy-900"
            >
              {POLICY_SLUGS.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label} ({p.slug})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Policy Title *</label>
            <input
              type="text"
              required
              value={policyTitle}
              onChange={(e) => setPolicyTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Markdown Content *</label>
          <textarea
            rows={8}
            required
            value={policyMarkdown}
            onChange={(e) => setPolicyMarkdown(e.target.value)}
            placeholder="## Editorial Policy\nSubmissions are reviewed for scope and quality."
            className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono text-navy-900"
          />
        </div>

        <Button type="submit" disabled={savingPolicy}>
          {savingPolicy ? 'Saving Policy...' : 'Save Policy Document'}
        </Button>
      </form>
    </div>
  )
}
