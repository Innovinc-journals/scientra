import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { FileText, ArrowLeft } from 'lucide-react'
import { api } from '../api/apiClient'
import { SafeMarkdown } from '../utils/safeMarkdown'

export default function PolicyPage() {
  const { slug } = useParams()
  const [policy, setPolicy] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    setLoading(true)
    api.policies
      .getBySlug(slug)
      .then((data) => {
        if (alive) setPolicy(data)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [slug])

  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    )
  }

  if (!policy) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center px-4">
        <FileText className="w-12 h-12 text-gray-300 mb-3" />
        <h1 className="text-2xl font-bold text-navy-950 mb-2">Policy unavailable</h1>
        <p className="text-sm text-gray-500 mb-6">This policy document could not be found.</p>
        <Link to="/about" className="text-sm font-semibold text-primary-600 hover:underline inline-flex items-center gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Back to About
        </Link>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-3xl border border-gray-100 shadow-sm p-8 sm:p-12">
        <h1 className="text-3xl font-black text-navy-950 tracking-tight mb-6 pb-4 border-b border-gray-100">
          {policy.title || slug}
        </h1>
        <SafeMarkdown content={policy.content_markdown || policy.content || ''} />
      </div>
    </div>
  )
}
