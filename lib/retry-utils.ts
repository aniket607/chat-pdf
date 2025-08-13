// Utility functions for handling API retries with exponential backoff

export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const { maxAttempts, initialDelayMs, maxDelayMs, backoffMultiplier } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...options,
  };

  let lastError: Error;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      // Check if it's a retryable error
      if (!isRetryableError(error)) {
        throw error;
      }

      // Don't wait on the last attempt
      if (attempt === maxAttempts) {
        break;
      }

      // Add some jitter to prevent thundering herd
      const jitter = Math.random() * 0.3; // ±30% jitter
      const actualDelay = delayMs * (1 + jitter);
      
      // Log retry attempts in development only
      if (process.env.NODE_ENV === 'development') {
        console.warn(`Attempt ${attempt}/${maxAttempts} failed, retrying in ${Math.round(actualDelay)}ms:`, 
          error instanceof Error ? error.message : 'Unknown error');
      }
      
      await new Promise(resolve => setTimeout(resolve, actualDelay));
      
      // Exponential backoff with max cap
      delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
    }
  }

  throw lastError!;
}

export function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  
  // Handle AI SDK errors
  if ('statusCode' in error) {
    const statusCode = error.statusCode as number;
    return statusCode >= 500 || statusCode === 429; // Server errors or rate limits
  }
  
  // Handle standard HTTP errors
  if ('status' in error) {
    const status = error.status as number;
    return status >= 500 || status === 429;
  }
  
  // Handle network errors
  if ('code' in error) {
    const code = error.code as string;
    return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(code);
  }
  
  // Handle AI SDK specific error types
  if ('reason' in error) {
    const reason = error.reason as string;
    return reason === 'maxRetriesExceeded' || reason === 'networkError';
  }
  
  return false;
}

export function createRetryableOperation<T>(
  operation: () => Promise<T>,
  context: string,
  options?: Partial<RetryOptions>
) {
  return () => withRetry(operation, {
    ...options,
    // Custom logging for specific contexts
  }).catch(error => {
    if (process.env.NODE_ENV === 'development') {
      console.error(`Failed ${context} after retries:`, error);
    }
    throw error;
  });
}
