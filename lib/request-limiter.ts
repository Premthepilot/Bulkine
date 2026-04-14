/**
 * Debounce a function - delays execution until after X ms of no calls
 * Useful for search, text input, and other frequent events
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeoutId = null
      func(...args)
    }

    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(later, delayMs)
  }
}

/**
 * Throttle a function - ensures function runs at most once every X ms
 * Useful for scroll, resize, and other continuous events
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): (...args: Parameters<T>) => void {
  let inThrottle = false
  let lastResult: any

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      lastResult = func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limitMs)
    }
    return lastResult
  }
}

/**
 * Create a request limiter for async operations
 * Prevents duplicate concurrent requests and enforces minimum interval
 */
export function createRequestLimiter(minIntervalMs: number = 1000) {
  let isRequesting = false
  let lastRequestTime = 0

  return {
    async execute<T>(fn: () => Promise<T>): Promise<T | null> {
      // Prevent concurrent requests
      if (isRequesting) {
        console.warn(`Request already in progress`)
        return null
      }

      // Enforce minimum interval
      const now = Date.now()
      const timeSinceLastRequest = now - lastRequestTime
      if (timeSinceLastRequest < minIntervalMs) {
        const waitTime = minIntervalMs - timeSinceLastRequest
        console.warn(`Rate limited: Wait ${waitTime}ms`)
        return null
      }

      try {
        isRequesting = true
        lastRequestTime = now
        return await fn()
      } finally {
        isRequesting = false
      }
    },

    canExecute(): boolean {
      if (isRequesting) return false
      const timeSinceLastRequest = Date.now() - lastRequestTime
      return timeSinceLastRequest >= minIntervalMs
    },

    getWaitTime(): number {
      if (isRequesting) return minIntervalMs
      const timeSinceLastRequest = Date.now() - lastRequestTime
      return Math.max(0, minIntervalMs - timeSinceLastRequest)
    },

    reset(): void {
      isRequesting = false
      lastRequestTime = 0
    }
  }
}
