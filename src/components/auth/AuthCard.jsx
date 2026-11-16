import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { BookOpen } from 'lucide-react'

// Same card layout and classes as Login.jsx so new auth pages match the existing design.
export const authInputClass =
  'w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50 focus:bg-white focus:border-primary-500 focus:ring-4 focus:ring-primary-500/10 transition-all outline-none text-sm font-medium text-navy-900 placeholder-gray-400'

export function AuthCard({ title, subtitle, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100"
      >
        <div className="flex flex-col items-center text-center">
          <Link to="/" className="flex items-center gap-2 group mb-6 inline-flex">
            <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20 group-hover:scale-105 transition-transform">
              <BookOpen className="text-white w-7 h-7" />
            </div>
          </Link>
          <h1 className="text-3xl font-black text-navy-950 tracking-tight mb-2">{title}</h1>
          {subtitle && <p className="text-gray-500 text-sm">{subtitle}</p>}
        </div>
        {children}
        {footer && <p className="text-center text-sm text-gray-500">{footer}</p>}
      </motion.div>
    </div>
  )
}

export function FormError({ message }) {
  if (!message) return null
  return (
    <div role="alert" className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-sm font-medium">
      {message}
    </div>
  )
}

export function FormNotice({ message }) {
  if (!message) return null
  return (
    <div role="status" className="p-4 bg-green-50 border border-green-200 rounded-2xl text-green-700 text-sm font-medium">
      {message}
    </div>
  )
}

export function FieldError({ message }) {
  if (!message) return null
  return <p className="text-xs text-red-600 font-medium">{message}</p>
}
