'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import Loading from '@/components/Loading'

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [sessionReady, setSessionReady] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    const init = async () => {
      // Session may already be in storage (e.g. from a previous visit)
      let { data: { session } } = await supabase.auth.getSession()

      // If no session but URL has recovery tokens in the hash, set session explicitly.
      // Supabase redirects with #access_token=...&refresh_token=...&type=recovery;
      // the client does not always restore session from hash, so we do it here.
      if (!session && typeof window !== 'undefined' && window.location.hash) {
        const params = new URLSearchParams(window.location.hash.slice(1))
        const accessToken = params.get('access_token')
        const refreshToken = params.get('refresh_token')
        const type = params.get('type')

        if (type === 'recovery' && accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (!error && data.session) {
            session = data.session
            // Remove tokens from URL for security and cleaner UI
            window.history.replaceState(null, '', window.location.pathname)
          }
        }
      }

      setSessionReady(!!session)
    }

    init()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionReady(!!session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long')
      setLoading(false)
      return
    }

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        throw new Error(updateError.message)
      }

      setSuccess(true)
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => {
        router.push('/login?reset=success')
      }, 2000)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  if (sessionReady === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loading message="Loading..." fullScreen />
      </div>
    )
  }

  if (!sessionReady) {
    return (
      <div className="min-h-screen bg-white">
        <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
          <div className="max-w-md w-full space-y-6 text-center">
            <h2 className="text-2xl font-bold text-gray-900">
              Reset link required
            </h2>
            <p className="text-gray-600">
              Please use the link from your password reset email to set a new
              password. Links expire after a short time.
            </p>
            <p className="text-sm text-gray-600">
              <Link
                href="/forgot-password"
                className="font-medium text-[#0d1e26] hover:text-[#416e82]"
              >
                Request a new reset link
              </Link>
              {' or '}
              <Link
                href="/login"
                className="font-medium text-[#0d1e26] hover:text-[#416e82]"
              >
                sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-gray-900">
              Set new password
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Enter your new password below.
            </p>
          </div>

          {success ? (
            <div className="rounded-md bg-green-50 p-4">
              <p className="text-sm text-green-800">
                Your password has been updated. Redirecting to sign in...
              </p>
            </div>
          ) : (
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  New password
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  placeholder="New password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="mt-1 text-xs text-gray-500">
                  At least 8 characters
                </p>
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Confirm new password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#0d1e26] focus:border-[#0d1e26]"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-[#0d1e26] hover:bg-[#0a171c] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#0d1e26] disabled:opacity-50"
                >
                  {loading ? 'Updating...' : 'Update password'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-600">
            <Link
              href="/login"
              className="font-medium text-[#0d1e26] hover:text-[#416e82]"
            >
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
