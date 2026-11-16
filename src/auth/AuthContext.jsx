import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/authApi'
import { session } from './session'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState(null)
  // 'loading' only while restoring a saved session on page load
  const [status, setStatus] = useState(session.hasRefreshToken() ? 'loading' : 'anonymous')

  // Restore the session (the HTTP client refreshes the access token automatically on 401).
  useEffect(() => {
    if (!session.hasRefreshToken()) return undefined
    let alive = true
    authApi
      .me()
      .then((me) => {
        if (!alive) return
        setUser(me)
        setStatus('authenticated')
      })
      .catch(() => {
        if (!alive) return
        setUser(null)
        setStatus('anonymous')
      })
    return () => {
      alive = false
    }
  }, [])

  // Session was ended elsewhere (refresh rejected, logout): reset everything.
  useEffect(
    () =>
      session.onClear(() => {
        setUser(null)
        setStatus('anonymous')
        queryClient.clear()
      }),
    [queryClient],
  )

  const startSession = useCallback(async (tokens, remember) => {
    session.setTokens(tokens, remember)
    try {
      const me = await authApi.me()
      setUser(me)
      setStatus('authenticated')
      return me
    } catch (err) {
      session.clear('me_failed')
      throw err
    }
  }, [])

  const login = useCallback(
    async ({ email, password, remember_me = false }) => {
      const tokens = await authApi.login({ email, password, remember_me })
      return startSession(tokens, remember_me)
    },
    [startSession],
  )

  const register = useCallback(
    async (body) => {
      const tokens = await authApi.register(body)
      return startSession(tokens, false)
    },
    [startSession],
  )

  const logout = useCallback(async () => {
    const refreshToken = session.getRefreshToken()
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {
      /* local sign-out must succeed even if the call fails */
    }
    session.clear('logout')
  }, [])

  const refreshUser = useCallback(async () => {
    const me = await authApi.me()
    setUser(me)
    return me
  }, [])

  const value = useMemo(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isLoading: status === 'loading',
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, status, login, register, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
