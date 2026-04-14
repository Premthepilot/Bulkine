import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from './supabase'
import { getCurrentUser, getUserProfile } from './supabase-data'

interface UseAuthProtectionOptions {
  requireProfile?: boolean // If true, redirect to /onboarding if no profile
}

interface AuthState {
  isLoading: boolean
  isAuthenticated: boolean
  error: string | null
  retry: () => void
}

/**
 * Custom hook for protecting routes with authentication
 *
 * Features:
 * - Redirects to /login if not authenticated
 * - Redirects to /onboarding if profile required but doesn't exist
 * - Prevents UI flashing by using loading state
 * - Returns loading state and error with retry capability
 */
export function useAuthProtection(options: UseAuthProtectionOptions = {}): AuthState {
  const { requireProfile = false } = options
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const checkAuth = async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Get authenticated user from Supabase
      const user = await getCurrentUser()

      if (!user) {
        // Not authenticated - redirect to login
        console.log('[Auth Protection] No user found, redirecting to /login')
        router.push('/login')
        return
      }

      setIsAuthenticated(true)

      // If profile is required, check if it exists
      if (requireProfile) {
        try {
          const profile = await getUserProfile()

          if (!profile) {
            // No profile - redirect to onboarding
            console.log('[Auth Protection] No profile found, redirecting to /onboarding')
            router.push('/onboarding')
            return
          }
        } catch (error) {
          console.error('[Auth Protection] Error checking profile:', error)
          // On error, show error but don't redirect (RLS will prevent data access)
          setError('Failed to load your profile. Please refresh the page.')
          return
        }
      }

      setIsLoading(false)
    } catch (error) {
      console.error('[Auth Protection] Auth check error:', error)
      setError('Authentication check failed. Please refresh the page.')
      setIsLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [router, requireProfile])

  return {
    isLoading,
    isAuthenticated,
    error,
    retry: checkAuth,
  }
}
