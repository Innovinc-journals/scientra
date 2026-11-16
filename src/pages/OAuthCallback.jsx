import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { AuthCard, FormError } from '../components/auth/AuthCard'
import { useAuth } from '../auth/AuthContext'
import { roleHome } from '../auth/roles'
import { toApiError } from '../api/errors'

const OAUTH_STORAGE_KEY = 'scientra.oauth'

export default function OAuthCallback() {
  const { provider: paramProvider } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { completeOAuth } = useAuth()
  const [error, setError] = useState('')
  const ranRef = useRef(false)

  useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true

    const code = searchParams.get('code')
    const returnedState = searchParams.get('state')

    let saved = null
    try {
      const raw = window.sessionStorage.getItem(OAUTH_STORAGE_KEY)
      window.sessionStorage.removeItem(OAUTH_STORAGE_KEY)
      if (raw) saved = JSON.parse(raw)
    } catch {
      /* ignore */
    }

    const provider = paramProvider || saved?.provider
    if (!code || !provider || !saved?.code_verifier || !saved?.state) {
      setError('OAuth sign-in session expired or is missing parameters. Please try signing in again.')
      return
    }
    if (returnedState && returnedState !== saved.state) {
      setError('OAuth state verification failed. Please start sign-in again.')
      return
    }

    completeOAuth(provider, {
      code,
      state: returnedState || saved.state,
      code_verifier: saved.code_verifier,
    })
      .then((me) => {
        navigate(roleHome(me?.role), { replace: true })
      })
      .catch((err) => {
        setError(toApiError(err).message)
      })
  }, [paramProvider, searchParams, completeOAuth, navigate])

  return (
    <AuthCard
      title={error ? 'Sign-in could not be completed' : 'Completing sign in'}
      subtitle={error ? undefined : 'Verifying your account credentials...'}
      footer={
        <Link to="/login" className="font-bold text-primary-600 hover:text-primary-500 transition-colors">
          Back to sign in
        </Link>
      }
    >
      {error ? (
        <FormError message={error} />
      ) : (
        <div className="flex justify-center py-4">
          <div className="w-8 h-8 border-2 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
        </div>
      )}
    </AuthCard>
  )
}
