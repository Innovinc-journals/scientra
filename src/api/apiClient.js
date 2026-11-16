import { JOURNALS, ARTICLES, CATEGORIES, STATS } from '../utils/data'
import { http, cleanParams } from './http'
import { downloadFromApi } from './download'

const staticJournalMap = Object.fromEntries(JOURNALS.map((j) => [j.id, j]))
const staticArticleMap = Object.fromEntries(ARTICLES.map((a) => [a.id, a]))
const staticCategoryMap = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]))
const journalTitleMap = Object.fromEntries(JOURNALS.map((j) => [j.id, j.title]))

function attachListMeta(items, raw) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    Object.defineProperty(items, 'meta', {
      value: {
        total: raw.total ?? items.length,
        page: raw.page ?? 1,
        page_size: raw.page_size ?? items.length,
      },
      enumerable: false,
    })
  }
  return items
}

export function adaptCategory(cat) {
  if (!cat) return null
  const fallback = staticCategoryMap[cat.id] || {}
  return {
    ...fallback,
    ...cat,
    id: String(cat.id),
    name: cat.name || fallback.name || cat.id,
    desc: cat.description || cat.desc || fallback.desc || '',
    description: cat.description || cat.desc || fallback.desc || '',
    color: cat.color_gradient || cat.color || fallback.color || 'from-blue-500 to-indigo-500',
  }
}

export function adaptJournal(journal) {
  if (!journal) return null
  const fallback = staticJournalMap[journal.id] || {}
  const articleCount =
    journal.stats?.articles ??
    journal.articles_count ??
    ARTICLES.filter((a) => a.journalId === journal.id).length ??
    fallback.stats?.articles ??
    0

  const categoryName =
    journal.category_name ||
    journal.category ||
    staticCategoryMap[journal.category_id]?.name ||
    fallback.category ||
    'General Science'

  const description = journal.description ?? fallback.description ?? ''
  const descriptionParagraphs =
    journal.descriptionParagraphs ||
    journal.description_paragraphs ||
    (description ? description.split(/\n\n+/).filter(Boolean) : fallback.descriptionParagraphs || [])

  const chiefEditor = journal.chiefEditor || journal.chief_editor || fallback.chiefEditor || null
  const sections = journal.sections || fallback.sections || []

  return {
    ...fallback,
    ...journal,
    id: String(journal.id),
    title: journal.title || fallback.title || journal.id,
    category: categoryName,
    categoryId: journal.category_id || journal.categoryId || fallback.categoryId || null,
    issn: journal.issn || fallback.issn || '',
    impactFactor: journal.impactFactor ?? journal.impact_factor ?? fallback.impactFactor ?? null,
    citeScore: journal.citeScore ?? journal.cite_score ?? fallback.citeScore ?? null,
    description,
    descriptionParagraphs,
    coverImage: journal.coverImage || journal.cover_image || fallback.coverImage || null,
    backgroundImage:
      journal.backgroundImage ||
      journal.background_image ||
      fallback.backgroundImage ||
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=2500',
    chiefEditor,
    sections,
    volumes: journal.volumes || fallback.volumes || [],
    specialIssues: journal.specialIssues || journal.special_issues || fallback.specialIssues || [],
    news: journal.news || fallback.news || [],
    stats: {
      ...(fallback.stats || {}),
      ...(journal.stats || {}),
      sections: journal.stats?.sections ?? sections.length ?? fallback.stats?.sections ?? 0,
      articles: articleCount,
      views: journal.stats?.views ?? journal.views_count ?? fallback.stats?.views ?? 0,
    },
  }
}

export function adaptArticle(article) {
  if (!article) return null
  const fallback = staticArticleMap[article.id] || {}
  const journalId = article.journal_id || article.journalId || fallback.journalId || ''
  const journalTitle =
    article.journal_title ||
    article.journalTitle ||
    journalTitleMap[journalId] ||
    fallback.journalTitle ||
    journalId

  let authors = article.authors || fallback.authors || []
  let authorAffiliations = article.authorAffiliations || article.author_affiliations || fallback.authorAffiliations || []

  if (Array.isArray(article.co_authors) && article.co_authors.length > 0) {
    authorAffiliations = article.co_authors.map((ca) => ({
      name: ca.name || [ca.first_name, ca.last_name].filter(Boolean).join(' ').trim() || ca.email || 'Author',
      affiliation: ca.affiliation_name || ca.affiliation || '',
      email: ca.email || null,
      orcid: ca.orcid_id || ca.orcid || null,
      isCorresponding: Boolean(ca.is_corresponding),
    }))
    if (!authors.length) {
      authors = authorAffiliations.map((a) => a.name)
    }
  } else if (Array.isArray(authors) && authors.length > 0 && typeof authors[0] === 'object') {
    authorAffiliations = authors.map((ca) => ({
      name: ca.name || [ca.first_name, ca.last_name].filter(Boolean).join(' ').trim() || 'Author',
      affiliation: ca.affiliation_name || ca.affiliation || '',
      email: ca.email || null,
      orcid: ca.orcid_id || ca.orcid || null,
      isCorresponding: Boolean(ca.is_corresponding),
    }))
    authors = authorAffiliations.map((a) => a.name)
  }

  return {
    ...fallback,
    ...article,
    id: String(article.id),
    journalId,
    journalTitle,
    sectionId: article.section_slug || article.section_id || article.sectionId || fallback.sectionId || null,
    title: article.title || fallback.title || 'Untitled Article',
    abstract: article.abstract || fallback.abstract || '',
    type: article.article_type || article.type || fallback.type || 'ORIGINAL RESEARCH',
    authors,
    authorAffiliations,
    publicationDate:
      article.published_at ||
      article.publication_date ||
      article.publicationDate ||
      article.created_at ||
      fallback.publicationDate ||
      null,
    views: article.views ?? article.views_count ?? fallback.views ?? 0,
    downloads: article.downloads ?? article.downloads_count ?? fallback.downloads ?? 0,
    citations: article.citations ?? article.citations_count ?? fallback.citations ?? 0,
    doi: article.doi || fallback.doi || null,
    tags: article.tags || article.keywords || fallback.tags || [],
  }
}

export function adaptNewsItem(item, index = 0) {
  if (!item) return null
  const journalId = item.journal_id || item.journalId || null
  return {
    ...item,
    id: String(item.id || `news-${index}`),
    title: item.title || 'Announcement',
    summary: item.summary || item.content || item.description || '',
    content: item.content || item.summary || '',
    image:
      item.image ||
      item.image_url ||
      'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&q=80&w=800',
    category: item.category || 'General Science',
    journalId,
    journalTitle: item.journal_title || item.journalTitle || (journalId ? journalTitleMap[journalId] : null),
    date: item.date || (item.published_at || item.created_at ? new Date(item.published_at || item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : ''),
  }
}

function getStaticNews() {
  return JOURNALS.reduce((acc, journal) => {
    if (Array.isArray(journal.news)) {
      const items = journal.news.map((item, idx) =>
        adaptNewsItem({
          ...item,
          id: `${journal.id}-news-${idx}`,
          category: journal.category || 'General Science',
          journalId: journal.id,
          journalTitle: journal.title,
        }),
      )
      return [...acc, ...items]
    }
    return acc
  }, [])
}

export const api = {
  journals: {
    list: async (params = {}) => {
      const data = await http.get('/journals', { params: cleanParams(params) }).then((r) => r.data)
      const items = Array.isArray(data?.items) ? data.items.map(adaptJournal) : []
      return {
        items,
        total: data?.total ?? items.length,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    getAll: async (params = {}) => {
      try {
        const cleaned = cleanParams(params)
        const data = await http.get('/journals', { params: cleaned }).then((r) => r.data)
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (rawItems.length > 0) {
          return attachListMeta(rawItems.map(adaptJournal), data)
        }
        if (Object.keys(cleaned).length > 0 && (data?.total ?? 0) > 0) {
          return attachListMeta([], data)
        }
      } catch {
        /* fall back to static catalog if offline or unseeded */
      }
      return JOURNALS.map(adaptJournal)
    },
    getById: async (id) => {
      try {
        const data = await http.get(`/journals/${encodeURIComponent(id)}`).then((r) => r.data)
        if (data) return adaptJournal(data)
      } catch (err) {
        const fallback = JOURNALS.find((j) => j.id === id)
        if (fallback) return adaptJournal(fallback)
        throw err
      }
      const fallback = JOURNALS.find((j) => j.id === id)
      if (!fallback) throw new Error('Journal not found')
      return adaptJournal(fallback)
    },
    getSection: async (journalId, sectionSlug) => {
      try {
        return await http
          .get(`/journals/${encodeURIComponent(journalId)}/sections/${encodeURIComponent(sectionSlug)}`)
          .then((r) => r.data)
      } catch (err) {
        const j = JOURNALS.find((item) => item.id === journalId)
        const section = j?.sections?.find((s) => s.slug === sectionSlug)
        if (section) return section
        throw err
      }
    },
    getVolumes: async (journalId, params = {}) => {
      try {
        const data = await http
          .get(`/journals/${encodeURIComponent(journalId)}/volumes`, { params: cleanParams(params) })
          .then((r) => r.data)
        return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      } catch {
        const j = JOURNALS.find((item) => item.id === journalId)
        return j?.volumes || []
      }
    },
    getSpecialIssues: async (journalId, params = {}) => {
      try {
        const data = await http
          .get(`/journals/${encodeURIComponent(journalId)}/special-issues`, { params: cleanParams(params) })
          .then((r) => r.data)
        return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      } catch {
        const j = JOURNALS.find((item) => item.id === journalId)
        return j?.specialIssues || []
      }
    },
    getEditorialBoard: async (journalId, params = {}) => {
      try {
        const data = await http
          .get(`/journals/${encodeURIComponent(journalId)}/editorial-board`, { params: cleanParams(params) })
          .then((r) => r.data)
        return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
    getNews: async (journalId, params = {}) => {
      try {
        const data = await http
          .get(`/journals/${encodeURIComponent(journalId)}/news`, { params: cleanParams(params) })
          .then((r) => r.data)
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (items.length > 0) return items.map(adaptNewsItem)
      } catch {
        /* fallback */
      }
      const j = JOURNALS.find((item) => item.id === journalId)
      return (j?.news || []).map((n, idx) =>
        adaptNewsItem({ ...n, id: `${journalId}-news-${idx}`, journalId, journalTitle: j?.title, category: j?.category }),
      )
    },
  },

  articles: {
    list: async (params = {}) => {
      const data = await http.get('/articles', { params: cleanParams(params) }).then((r) => r.data)
      const items = Array.isArray(data?.items) ? data.items.map(adaptArticle) : []
      return {
        items,
        total: data?.total ?? items.length,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    getAll: async (params = {}) => {
      try {
        const cleaned = cleanParams(params)
        const data = await http.get('/articles', { params: cleaned }).then((r) => r.data)
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (rawItems.length > 0) {
          return attachListMeta(rawItems.map(adaptArticle), data)
        }
        if (Object.keys(cleaned).length > 0 && (data?.total ?? 0) > 0) {
          return attachListMeta([], data)
        }
      } catch {
        /* fall back to static articles */
      }
      return ARTICLES.map(adaptArticle)
    },
    getTrending: async (params = {}) => {
      try {
        const data = await http.get('/articles/trending', { params: cleanParams(params) }).then((r) => r.data)
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (rawItems.length > 0) return rawItems.map(adaptArticle)
      } catch {
        /* fallback */
      }
      return [...ARTICLES]
        .map(adaptArticle)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 5)
    },
    getMostViewed: async (params = {}) => {
      try {
        const data = await http.get('/articles/most-viewed', { params: cleanParams(params) }).then((r) => r.data)
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (rawItems.length > 0) return rawItems.map(adaptArticle)
      } catch {
        /* fallback */
      }
      return [...ARTICLES]
        .map(adaptArticle)
        .sort((a, b) => (b.views || 0) - (a.views || 0))
        .slice(0, 4)
    },
    getByJournal: async (journalId, params = {}) => {
      try {
        const data = await http
          .get(`/journals/${encodeURIComponent(journalId)}/articles`, { params: cleanParams(params) })
          .then((r) => r.data)
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (rawItems.length > 0) return rawItems.map(adaptArticle)
      } catch {
        /* fallback */
      }
      return ARTICLES.filter((a) => a.journalId === journalId).map(adaptArticle)
    },
    getByJournalAndSection: async (journalId, sectionId) => {
      try {
        const sec = await http
          .get(`/journals/${encodeURIComponent(journalId)}/sections/${encodeURIComponent(sectionId)}`)
          .then((r) => r.data)
        if (Array.isArray(sec?.articles) && sec.articles.length > 0) {
          return sec.articles.map(adaptArticle)
        }
        if (Array.isArray(sec?.items) && sec.items.length > 0) {
          return sec.items.map(adaptArticle)
        }
      } catch {
        /* fallback */
      }
      return ARTICLES.filter((a) => a.journalId === journalId && a.sectionId === sectionId).map(adaptArticle)
    },
    getById: async (id) => {
      try {
        const data = await http.get(`/articles/${encodeURIComponent(id)}`).then((r) => r.data)
        if (data) return adaptArticle(data)
      } catch (err) {
        const fallback = ARTICLES.find((a) => a.id === id)
        if (fallback) return adaptArticle(fallback)
        throw err
      }
      const fallback = ARTICLES.find((a) => a.id === id)
      if (!fallback) throw new Error('Article not found')
      return adaptArticle(fallback)
    },
    getRelated: async (id, params = {}) => {
      try {
        const data = await http
          .get(`/articles/${encodeURIComponent(id)}/related`, { params: cleanParams(params) })
          .then((r) => r.data)
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (items.length > 0) return items.map(adaptArticle)
      } catch {
        /* fallback */
      }
      const current = ARTICLES.find((a) => a.id === id)
      if (!current) return []
      return ARTICLES.filter((a) => a.journalId === current.journalId && a.id !== id)
        .slice(0, 3)
        .map(adaptArticle)
    },
    recordView: async (id) => {
      try {
        return await http.post(`/articles/${encodeURIComponent(id)}/view`).then((r) => r.data)
      } catch {
        return { counted: false }
      }
    },
    download: (id, fallbackFilename) =>
      downloadFromApi(`/articles/${encodeURIComponent(id)}/download`, {
        fallbackFilename: fallbackFilename || `${id}.pdf`,
        openInNewTab: true,
      }),
  },

  categories: {
    getAll: async (params = {}) => {
      try {
        const data = await http.get('/categories', { params: cleanParams(params) }).then((r) => r.data)
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (rawItems.length > 0) return rawItems.map(adaptCategory)
      } catch {
        /* fallback */
      }
      return CATEGORIES.map(adaptCategory)
    },
  },

  stats: {
    get: async () => {
      try {
        const data = await http.get('/stats').then((r) => r.data)
        if (data && typeof data === 'object') {
          return {
            ...STATS,
            ...data,
            countries: data.countries ?? null,
          }
        }
      } catch {
        /* fallback */
      }
      return STATS
    },
  },

  news: {
    getAll: async (params = {}) => {
      try {
        const data = await http.get('/news', { params: cleanParams(params) }).then((r) => r.data)
        const rawItems = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
        if (rawItems.length > 0) {
          return attachListMeta(rawItems.map(adaptNewsItem), data)
        }
      } catch {
        /* fallback */
      }
      const staticItems = getStaticNews()
      if (params?.category && params.category !== 'All') {
        return staticItems.filter((n) => n.category === params.category)
      }
      return staticItems
    },
    getById: async (id) => {
      try {
        const data = await http.get(`/news/${encodeURIComponent(id)}`).then((r) => r.data)
        return adaptNewsItem(data)
      } catch (err) {
        const found = getStaticNews().find((n) => n.id === id)
        if (found) return found
        throw err
      }
    },
  },

  editorialBoard: {
    getAll: async (params = {}) => {
      try {
        const data = await http.get('/editorial-board', { params: cleanParams(params) }).then((r) => r.data)
        return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
  },

  policies: {
    getAll: async (params = {}) => {
      try {
        const data = await http.get('/policies', { params: cleanParams(params) }).then((r) => r.data)
        return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      } catch {
        return []
      }
    },
    getBySlug: async (slug) => {
      try {
        return await http.get(`/policies/${encodeURIComponent(slug)}`).then((r) => r.data)
      } catch {
        return null
      }
    },
  },

  bookmarks: {
    getAll: async (params = {}) => {
      const data = await http.get('/bookmarks', { params: cleanParams(params) }).then((r) => r.data)
      const items = Array.isArray(data?.items) ? data.items.map(adaptArticle) : []
      return {
        items,
        total: data?.total ?? items.length,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    add: (articleId) => http.post(`/bookmarks/${encodeURIComponent(articleId)}`).then((r) => r.data),
    remove: (articleId) => http.delete(`/bookmarks/${encodeURIComponent(articleId)}`),
  },

  contact: {
    submit: (body) => http.post('/contact', body).then((r) => r.data),
  },

  applications: {
    applyEditor: (body) =>
      http
        .post('/applications/apply-editor', {
          website: '',
          ...body,
        })
        .then((r) => r.data),
  },

  manuscripts: {
    submit: (formData) => http.post('/manuscripts/submit', formData).then((r) => r.data),
    mySubmissions: async (params = {}) => {
      const data = await http.get('/manuscripts/my-submissions', { params: cleanParams(params) }).then((r) => r.data)
      return {
        items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    getById: (id) => http.get(`/manuscripts/${encodeURIComponent(id)}`).then((r) => r.data),
    submitRevision: (id, formData) =>
      http.post(`/manuscripts/${encodeURIComponent(id)}/revisions`, formData).then((r) => r.data),
    downloadProof: (id) =>
      downloadFromApi(`/manuscripts/${encodeURIComponent(id)}/proof`, {
        fallbackFilename: `proof-${id}.pdf`,
        openInNewTab: true,
      }),
    approveProof: (id, proof_version) =>
      http
        .post(`/manuscripts/${encodeURIComponent(id)}/approve-proof`, { proof_version: Number(proof_version) })
        .then((r) => r.data),
    requestApcWaiver: (id, reason) =>
      http.post(`/manuscripts/${encodeURIComponent(id)}/apc-waiver`, { reason }).then((r) => r.data),
  },

  editor: {
    listManuscripts: async (params = {}) => {
      const data = await http.get('/editor/manuscripts', { params: cleanParams(params) }).then((r) => r.data)
      return {
        items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    getManuscript: (id) => http.get(`/editor/manuscripts/${encodeURIComponent(id)}`).then((r) => r.data),
    downloadVersion: (id, versionNumber) =>
      downloadFromApi(
        `/editor/manuscripts/${encodeURIComponent(id)}/versions/${encodeURIComponent(versionNumber)}/download`,
        {
          fallbackFilename: `manuscript-${id}-v${versionNumber}.pdf`,
          openInNewTab: true,
        },
      ),
    submitDecision: (id, { decision, remarks }) =>
      http.patch(`/editor/manuscripts/${encodeURIComponent(id)}/decision`, { decision, remarks }).then((r) => r.data),
  },

  admin: {
    dashboard: () => http.get('/admin/dashboard').then((r) => r.data),
    listManuscripts: async (params = {}) => {
      const data = await http.get('/admin/manuscripts', { params: cleanParams(params) }).then((r) => r.data)
      return {
        items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    getManuscript: (id) => http.get(`/admin/manuscripts/${encodeURIComponent(id)}`).then((r) => r.data),
    downloadManuscript: (id, version) =>
      downloadFromApi(`/admin/manuscripts/${encodeURIComponent(id)}/download`, {
        params: version ? { version } : undefined,
        fallbackFilename: `manuscript-${id}${version ? `-v${version}` : ''}`,
        openInNewTab: true,
      }),
    claimManuscript: (id) => http.post(`/admin/manuscripts/${encodeURIComponent(id)}/claim`).then((r) => r.data),
    assignEmployee: (id, { stage, employee_id, note }) =>
      http
        .post(`/admin/manuscripts/${encodeURIComponent(id)}/assign-employee`, { stage, employee_id, note })
        .then((r) => r.data),
    recordScreeningCheck: (id, body) =>
      http.post(`/admin/manuscripts/${encodeURIComponent(id)}/screening-checks`, body).then((r) => r.data),
    submitScreeningDecision: (id, body) =>
      http.post(`/admin/manuscripts/${encodeURIComponent(id)}/screening-decision`, body).then((r) => r.data),
    assignEditor: (id, { editor_id, note }) =>
      http
        .post(`/admin/manuscripts/${encodeURIComponent(id)}/assign-editor`, { editor_id, note })
        .then((r) => r.data),
    overrideDecision: (id, { decision, remarks }) =>
      http.patch(`/admin/manuscripts/${encodeURIComponent(id)}/decision`, { decision, remarks }).then((r) => r.data),
    listProduction: async (params = {}) => {
      const data = await http.get('/admin/production', { params: cleanParams(params) }).then((r) => r.data)
      return {
        items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    uploadProof: (id, file) => {
      const form = new FormData()
      form.append('file', file)
      return http.post(`/admin/manuscripts/${encodeURIComponent(id)}/proof`, form).then((r) => r.data)
    },
    updateProductionTask: (id, task, { status = 'DONE', notes = '' }) =>
      http
        .patch(`/admin/manuscripts/${encodeURIComponent(id)}/production-tasks/${encodeURIComponent(task)}`, {
          status,
          notes,
        })
        .then((r) => r.data),
    registerDoi: (id) => http.post(`/admin/manuscripts/${encodeURIComponent(id)}/register-doi`).then((r) => r.data),
    getDoiStatus: (id) => http.get(`/admin/manuscripts/${encodeURIComponent(id)}/doi-status`).then((r) => r.data),
    publishManuscript: (id) => http.post(`/admin/manuscripts/${encodeURIComponent(id)}/publish`).then((r) => r.data),

    listEmployees: async (params = {}) => {
      const data = await http.get('/admin/employees', { params: cleanParams(params) }).then((r) => r.data)
      return {
        items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    createEmployee: ({ name, email, role }) =>
      http.post('/admin/employees', { name, email, role }).then((r) => r.data),
    updateEmployee: (id, body) =>
      http.patch(`/admin/employees/${encodeURIComponent(id)}`, cleanParams(body)).then((r) => r.data),
    deactivateEmployee: (id) =>
      http.delete(`/admin/employees/${encodeURIComponent(id)}`).then((r) => r.data),

    listApplications: async (params = {}) => {
      const data = await http.get('/admin/applications', { params: cleanParams(params) }).then((r) => r.data)
      return {
        items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    getApplication: (id) => http.get(`/admin/applications/${encodeURIComponent(id)}`).then((r) => r.data),
    decideApplication: (id, decision) =>
      http
        .post(`/admin/applications/${encodeURIComponent(id)}/${encodeURIComponent(decision)}`)
        .then((r) => r.data),

    listInquiries: async (params = {}) => {
      const data = await http.get('/admin/inquiries', { params: cleanParams(params) }).then((r) => r.data)
      return {
        items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    resolveInquiry: (id) => http.patch(`/admin/inquiries/${encodeURIComponent(id)}`).then((r) => r.data),

    listApcWaivers: async (params = {}) => {
      const data = await http.get('/admin/apc-waivers', { params: cleanParams(params) }).then((r) => r.data)
      return {
        items: Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [],
        total: data?.total ?? 0,
        page: data?.page ?? 1,
        page_size: data?.page_size ?? 20,
      }
    },
    decideApcWaiver: (id, decision) =>
      http
        .post(`/admin/apc-waivers/${encodeURIComponent(id)}/${encodeURIComponent(decision)}`)
        .then((r) => r.data),

    getSettings: () => http.get('/admin/settings').then((r) => r.data),
    updateSettings: (body) => http.put('/admin/settings', body).then((r) => r.data),
    updatePolicy: (slug, { title, content_markdown }) =>
      http.put(`/admin/policies/${encodeURIComponent(slug)}`, { title, content_markdown }).then((r) => r.data),
    createCategory: (body) => http.post('/admin/categories', body).then((r) => r.data),
    createJournal: (body) => http.post('/admin/journals', body).then((r) => r.data),
  },
}
