/**
 * Retry logic and error handling utilities
 */

import { WorkflowError, WorkflowStep } from './types.js';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  backoffMultiplier: 2,
};

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  const { maxRetries, initialDelay, maxDelay, backoffMultiplier } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: Error | undefined;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        if (onRetry) {
          onRetry(attempt + 1, lastError);
        }
        
        console.log(`⚠️  Attempt ${attempt + 1} failed: ${lastError.message}`);
        console.log(`   Retrying in ${delay}ms...`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        delay = Math.min(delay * backoffMultiplier, maxDelay);
      }
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  const retryablePatterns = [
    /timeout/i,
    /network/i,
    /connection/i,
    /ECONNREFUSED/i,
    /ETIMEDOUT/i,
    /rate limit/i,
    /too many requests/i,
    /503/i,
    /504/i,
  ];

  return retryablePatterns.some(pattern => 
    pattern.test(error.message) || 
    pattern.test(error.name)
  );
}

/**
 * Create a workflow error
 */
export function createWorkflowError(
  step: WorkflowStep,
  message: string,
  error?: Error,
  retryable?: boolean
): WorkflowError {
  return {
    step,
    message,
    error,
    timestamp: new Date().toISOString(),
    retryable: retryable ?? (error ? isRetryableError(error) : false),
  };
}

/**
 * Timeout wrapper for promises
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  let timeoutId: NodeJS.Timeout;
  
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId!);
  }
}

/**
 * Circuit breaker for preventing cascading failures
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime?: number;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private threshold: number = 5,
    private resetTimeout: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      const now = Date.now();
      if (this.lastFailureTime && now - this.lastFailureTime > this.resetTimeout) {
        console.log('🔄 Circuit breaker: transitioning to half-open');
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open - too many recent failures');
      }
    }

    try {
      const result = await fn();
      
      if (this.state === 'half-open') {
        console.log('✅ Circuit breaker: transitioning to closed');
        this.state = 'closed';
        this.failures = 0;
      }
      
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();
      
      if (this.failures >= this.threshold) {
        console.log('🚨 Circuit breaker: transitioning to open');
        this.state = 'open';
      }
      
      throw error;
    }
  }

  reset(): void {
    this.failures = 0;
    this.state = 'closed';
    this.lastFailureTime = undefined;
  }

  getState(): string {
    return this.state;
  }
}
