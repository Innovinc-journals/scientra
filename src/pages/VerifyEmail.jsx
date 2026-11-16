import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MailCheck, KeyRound, CheckCircle, ArrowRight } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { AuthCard, FormError, FormNotice, authInputClass } from '../components/auth/AuthCard'
import { authApi } from '../api/authApi'
import { toApiError } from '../api/errors'
import { useAuth } from '../auth/AuthContext'
import { roleHome } from '../auth/roles'
import { session } from '../auth/session'
import { takeFragmentToken, clearFragmentToken } from '../auth/tokenFragment'

const RESEND_COOLDOWN = 60

export default function VerifyEmail() {
  const navigate = useNavigate()
  const { user, isAuthenticated, refreshUser } = useAuth()
  const [fragmentToken] = useState(() => takeFragmentToken('/verify-email'))
  const [manualToken, setManualToken] = useState('')
  const [phase, setPhase] = useState(fragmentToken ? 'verifying' : 'idle') // idle | verifying | success | error
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [isResending, setIsResending] = useState(false)
  const autoRan = useRef(false)

  const verify = useCallback(
    async (token) => {
      setPhase('verifying')
      setError('')
      try {
        await authApi.verifyEmail(token)
        clearFragmentToken()
        setPhase('success')
        if (session.hasRefreshToken()) {
          try {
            await refreshUser() // email_verified is now true
          } catch {
            /* non-fatal */
          }
        }
      } catch (err) {
        setPhase('error')
        setError(toApiError(err).message)
      }
    },
    [refreshUser],
  )

  // Verify automatically when the email link carried a token (guarded so it runs once).
  useEffect(() => {
    if (fragmentToken && !autoRan.current) {
      autoRan.current = true
      verify(fragmentToken)
    }
  }, [fragmentToken, verify])

  useEffect(() => {
    if (cooldown <= 0) return undefined
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(id)
  }, [cooldown])

  const handleManual = (e) => {
    e.preventDefault()
    const token = manualToken.trim()
    if (!token) {
      setError('Enter the code from your email.')
      return
    }
    verify(token)
  }

  const handleResend = async () => {
    setIsResending(true)
    setError('')
    setNotice('')
    try {
      await authApi.resendVerification()
      setNotice('If your email still needs verification, a new link is on its way.')
      setCooldown(RESEND_COOLDOWN)
    } catch (err) {
      const apiErr = toApiError(err)
      setError(apiErr.message)
      if (apiErr.status === 429) setCooldown(apiErr.retryAfter || RESEND_COOLDOWN)
    } finally {
      setIsResending(false)
    }
  }

  if (phase === 'success') {
    return (
      <AuthCard title="Email verified" subtitle="Your email address has been confirmed.">
        <div className="flex flex-col items-center gap-6">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <Button
            className="w-full py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            onClick={() => navigate(isAuthenticated && user ? roleHome(user.role) : '/login', { replace: true })}
          >
            {isAuthenticated ? 'Continue' : 'Go to sign in'} <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </AuthCard>
    )
  }

  if (phase === 'verifying') {
    return (
      <AuthCard title="Verifying your email" subtitle="Please wait a moment.">
        <div className="flex justify-center">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={phase === 'error' ? 'Verification problem' : 'Check your inbox'}
      subtitle={
        phase === 'error'
          ? 'The link may be invalid, expired or already used.'
          : `We sent a verification link${user?.email ? ` to ${user.email}` : ''}. It is valid for 24 hours.`
      }
      footer={
        <Link to={isAuthenticated && user ? roleHome(user.role) : '/login'} className="font-bold text-primary-600 hover:text-primary-500 transition-colors">
          {isAuthenticated ? 'Continue to the site' : 'Back to sign in'}
        </Link>
      }
    >
      <div className="space-y-5 mt-2">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center">
            <MailCheck className="w-8 h-8 text-primary-600" />
          </div>
        </div>
        <FormError message={error} />
        <FormNotice message={notice} />

        <form onSubmit={handleManual} className="space-y-3">
          <label className="text-sm font-semibold text-navy-900">Have a code instead?</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <KeyRound className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              autoComplete="off"
              value={manualToken}
              onChange={(e) => setManualToken(e.target.value)}
              className={authInputClass}
              placeholder="Paste the code from your email"
            />
          </div>
          <Button type="submit" className="w-full py-3 rounded-xl text-sm font-bold">
            Verify email
          </Button>
        </form>

        {isAuthenticated ? (
          <Button
            type="button"
            variant="outline"
            className="w-full py-3 rounded-xl text-sm font-semibold"
            onClick={handleResend}
            disabled={isResending || cooldown > 0}
          >
            {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
          </Button>
        ) : (
          <p className="text-xs text-gray-500 text-center">
            <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-500">
              Sign in
            </Link>{' '}
            to resend the verification email.
          </p>
        )}
      </div>
    </AuthCard>
  )
}
