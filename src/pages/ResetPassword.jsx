import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Lock, KeyRound, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { AuthCard, FormError, FieldError, authInputClass } from '../components/auth/AuthCard'
import { authApi } from '../api/authApi'
import { toApiError, fieldErrorMap } from '../api/errors'
import { takeFragmentToken, clearFragmentToken } from '../auth/tokenFragment'
import { validatePassword, PASSWORD_HINT } from '../utils/passwordRules'

export default function ResetPassword() {
  const navigate = useNavigate()
  // Token comes from the email link fragment; kept in memory only. Manual entry if absent.
  const [fragmentToken] = useState(() => takeFragmentToken('/reset-password'))
  const [manualToken, setManualToken] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({})
  const [tokenProblem, setTokenProblem] = useState(false)

  const token = fragmentToken || manualToken.trim()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    if (!token) {
      setFieldErrors({ token: 'Enter the code from your email.' })
      return
    }
    const problem = validatePassword(password, confirmPassword)
    if (problem) {
      setFieldErrors({ password: problem })
      return
    }
    setIsLoading(true)
    try {
      await authApi.resetPassword({ token, password, confirm_password: confirmPassword })
      clearFragmentToken()
      navigate('/login', { replace: true, state: { notice: 'Password updated. Please sign in with your new password.' } })
    } catch (err) {
      const apiErr = toApiError(err)
      const mapped = fieldErrorMap(apiErr)
      if (Object.keys(mapped).length) setFieldErrors(mapped)
      else setError(apiErr.message)
      if (apiErr.status === 400 || apiErr.status === 404 || apiErr.status === 410 || apiErr.status === 422) {
        setTokenProblem(true)
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      title="Choose a new password"
      subtitle="Enter a new password for your account."
      footer={
        <Link to="/login" className="font-bold text-primary-600 hover:text-primary-500 transition-colors">
          Back to sign in
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5 mt-8">
        <FormError message={error} />
        {tokenProblem && (
          <p className="text-sm text-gray-600">
            This reset link may be invalid, expired or already used.{' '}
            <Link to="/forgot-password" className="font-bold text-primary-600 hover:text-primary-500">
              Request a new link
            </Link>
          </p>
        )}

        {!fragmentToken && (
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-navy-900">Reset code</label>
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
            <FieldError message={fieldErrors.token} />
          </div>
        )}

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-navy-900">New password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${authInputClass} pr-11`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <p className="text-xs text-gray-500">{PASSWORD_HINT}</p>
          <FieldError message={fieldErrors.password} />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-semibold text-navy-900">Confirm password</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <Lock className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type={showConfirm ? 'text' : 'password'}
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`${authInputClass} pr-11`}
              placeholder="••••••••"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((v) => !v)}
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
              className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-gray-400 hover:text-gray-600"
            >
              {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
          <FieldError message={fieldErrors.confirm_password} />
        </div>

        <Button
          type="submit"
          className="w-full py-3.5 mt-2 rounded-xl text-sm font-bold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
          ) : (
            <>Update password <ArrowRight className="w-4 h-4" /></>
          )}
        </Button>
      </form>
    </AuthCard>
  )
}
