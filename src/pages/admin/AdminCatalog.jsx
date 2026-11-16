import React, { useEffect, useState } from 'react'
import { Layers, BookOpen, Plus } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { FormError, FormNotice } from '../../components/auth/AuthCard'
import { api } from '../../api/apiClient'
import { toApiError } from '../../api/errors'

export default function AdminCatalog() {
  const [categories, setCategories] = useState([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Category creation state (omit id — backend generates it)
  const [catForm, setCatForm] = useState({
    name: '',
    description: '',
    color_gradient: '',
    display_order: 0,
  })
  const [creatingCat, setCreatingCat] = useState(false)

  // Journal creation state (omit id — backend generates it; ISSN required in 1234-567X format)
  const [journalForm, setJournalForm] = useState({
    category_id: '',
    title: '',
    issn: '',
    description: '',
  })
  const [creatingJournal, setCreatingJournal] = useState(false)

  const loadCategories = () => {
    api.categories
      .getAll({ page_size: 100 })
      .then((list) => {
        setCategories(list || [])
        if (list?.length && !journalForm.category_id) {
          setJournalForm((prev) => ({ ...prev, category_id: list[0].id }))
        }
      })
      .catch(() => {})
  }

  useEffect(() => {
    loadCategories()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCreateCategory = async (e) => {
    e.preventDefault()
    setCreatingCat(true)
    setError('')
    setNotice('')
    try {
      const created = await api.admin.createCategory({
        name: catForm.name.trim(),
        description: catForm.description.trim(),
        color_gradient: catForm.color_gradient.trim(),
        display_order: Number(catForm.display_order) || 0,
      })
      setCatForm({ name: '', description: '', color_gradient: '', display_order: 0 })
      setNotice(`Category "${created?.name || catForm.name}" created (ID: ${created?.id || 'generated'}).`)
      loadCategories()
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setCreatingCat(false)
    }
  }

  const handleCreateJournal = async (e) => {
    e.preventDefault()
    setError('')
    setNotice('')
    if (!/^\d{4}-\d{3}[\dX]$/.test(journalForm.issn.trim())) {
      setError('Journal creation requires a valid ISSN in 1234-567X format.')
      return
    }
    setCreatingJournal(true)
    try {
      const created = await api.admin.createJournal({
        category_id: journalForm.category_id,
        title: journalForm.title.trim(),
        issn: journalForm.issn.trim(),
        description: journalForm.description.trim(),
      })
      setJournalForm((prev) => ({ ...prev, title: '', issn: '', description: '' }))
      setNotice(`Journal "${created?.title || journalForm.title}" created (ID: ${created?.id || 'generated'}).`)
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setCreatingJournal(false)
    }
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-2xl font-bold text-navy-950">Academic Catalog (Categories &amp; Journals)</h2>
        <p className="text-gray-500 text-sm mt-1">
          Create new subject categories and journals. The backend generates the ID automatically.
        </p>
      </div>

      <FormError message={error} />
      <FormNotice message={notice} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Category */}
        <form onSubmit={handleCreateCategory} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <Layers className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-navy-950">Create Category</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category Name *</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={150}
              value={catForm.name}
              onChange={(e) => setCatForm({ ...catForm, name: e.target.value })}
              placeholder="e.g. Computer Science"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea
              rows={3}
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
              placeholder="Computing and information systems journals"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Color Gradient (optional)</label>
              <input
                type="text"
                value={catForm.color_gradient}
                onChange={(e) => setCatForm({ ...catForm, color_gradient: e.target.value })}
                placeholder="from-blue-500 to-indigo-500"
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Display Order</label>
              <input
                type="number"
                value={catForm.display_order}
                onChange={(e) => setCatForm({ ...catForm, display_order: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-gray-50 text-xs text-navy-900"
              />
            </div>
          </div>

          <Button type="submit" disabled={creatingCat} className="w-full gap-1.5">
            <Plus className="w-4 h-4" />
            {creatingCat ? 'Creating Category...' : 'Create Category'}
          </Button>
        </form>

        {/* Create Journal */}
        <form onSubmit={handleCreateJournal} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-gray-100">
            <BookOpen className="w-5 h-5 text-primary-600" />
            <h3 className="text-lg font-bold text-navy-950">Create Journal</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Category *</label>
            <select
              required
              value={journalForm.category_id}
              onChange={(e) => setJournalForm({ ...journalForm, category_id: e.target.value })}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
            >
              <option value="" disabled>
                -- Select Category --
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.id})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Journal Title *</label>
            <input
              type="text"
              required
              minLength={2}
              maxLength={255}
              value={journalForm.title}
              onChange={(e) => setJournalForm({ ...journalForm, title: e.target.value })}
              placeholder="Journal of Example Computing"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">ISSN * (Format: 1234-567X)</label>
            <input
              type="text"
              required
              pattern="\d{4}-\d{3}[\dX]"
              value={journalForm.issn}
              onChange={(e) => setJournalForm({ ...journalForm, issn: e.target.value })}
              placeholder="1234-567X"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm font-mono text-navy-900"
            />
            <p className="text-[11px] text-gray-500 mt-1">
              A registered ISSN in 1234-567X format is currently required by the backend contract. If a journal is awaiting its ISSN, register it after the ISSN is assigned.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description *</label>
            <textarea
              rows={3}
              required
              value={journalForm.description}
              onChange={(e) => setJournalForm({ ...journalForm, description: e.target.value })}
              placeholder="Research in computing and information systems."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm text-navy-900"
            />
          </div>

          <Button type="submit" disabled={creatingJournal} className="w-full gap-1.5">
            <Plus className="w-4 h-4" />
            {creatingJournal ? 'Creating Journal...' : 'Create Journal'}
          </Button>
        </form>
      </div>
    </div>
  )
}
