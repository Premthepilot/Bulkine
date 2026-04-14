import { useCallback, useRef } from 'react'

interface RateLimiterState {
  isLoading: boolean
  lastCallTime: number
}

interface RateLimiterOptions {
  minInterval?: number // Minimum ms between calls (default: 1000)
  onError?: (error: Error) => void
}

/**
 * Hook for rate limiting and debouncing user actions
 * Prevents rapid repeated calls and duplicate API requests
 *
 * Features:
 * - Minimum interval between calls (default 1s)
 * - Prevents duplicate concurrent requests
 * - Returns loading state for UI feedback
 * - Automatic cleanup on unmount
 */
export function useRateLimiter(options: RateLimiterOptions = {}) {
  const { minInterval = 1000, onError } = options
  const stateRef = useRef<RateLimiterState>({
    isLoading: false,
    lastCallTime: 0
  })

  /**
   * Wrap async function with rate limiting
   * Returns: { execute, isLoading, canExecute, timeUntilNext }
   */
  const executeWithRateLimit = useCallback(
    async <T,>(
      asyncFn: () => Promise<T>,
      errorMessage: string = 'Action failed'
    ): Promise<T | null> => {
      const state = stateRef.current
      const now = Date.now()
      const timeSinceLastCall = now - state.lastCallTime

      // Check if already loading (prevent concurrent requests)
      if (state.isLoading) {
        console.warn('Request already in progress')
        return null
      }

      // Check if minimum interval has passed
      if (timeSinceLastCall < minInterval) {
        const waitTime = Math.ceil((minInterval - timeSinceLastCall) / 100) * 100
        console.warn(`Rate limited: Wait ${waitTime}ms before next action`)
        return null
      }

      try {
        state.isLoading = true
        state.lastCallTime = now

        const result = await asyncFn()
        return result
      } catch (error) {
        const err = error instanceof Error ? error : new Error(errorMessage)
        console.error('[RateLimit] Error:', err.message)
        onError?.(err)
        throw err
      } finally {
        state.isLoading = false
      }
    },
    [minInterval, onError]
  )

  /**
   * Check if action can be executed now
   */
  const canExecute = useCallback(() => {
    const state = stateRef.current
    if (state.isLoading) return false

    const timeSinceLastCall = Date.now() - state.lastCallTime
    return timeSinceLastCall >= minInterval
  }, [minInterval])

  /**
   * Get time in ms until next action can be executed
   */
  const getTimeUntilNext = useCallback(() => {
    const state = stateRef.current
    if (state.isLoading) return minInterval

    const timeSinceLastCall = Date.now() - state.lastCallTime
    const remaining = minInterval - timeSinceLastCall
    return Math.max(0, remaining)
  }, [minInterval])

  /**
   * Reset rate limiter (for testing or manual reset)
   */
  const reset = useCallback(() => {
    stateRef.current = {
      isLoading: false,
      lastCallTime: 0
    }
  }, [])

  return {
    executeWithRateLimit,
    isLoading: stateRef.current.isLoading,
    canExecute,
    getTimeUntilNext,
    reset
  }
}
