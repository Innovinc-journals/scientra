import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { AuthCard, FormError, FormNotice, authInputClass } from '../components/auth/AuthCard'
import { authApi } from '../api/authApi'
import { toApiError } from '../api/errors'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')
    try {
      await authApi.forgotPassword(email.trim())
      setSent(true) // generic confirmation, whether or not the account exists
    } catch (err) {
      setError(toApiError(err).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="font-bold text-primary-600 hover:text-primary-500 transition-colors">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <FormNotice message="If an account exists for that email, a password reset link has been sent. The link is valid for 30 minutes." />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5 mt-8">
          <FormError message={error} />
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-navy-900">Email address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={authInputClass}
                placeholder="Enter your email"
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full py-3.5 mt-2 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>Send reset link <ArrowRight className="w-4 h-4" /></>
            )}
          </Button>
        </form>
      )}
    </AuthCard>
  )
}
