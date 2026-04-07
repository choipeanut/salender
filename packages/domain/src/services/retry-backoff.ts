export interface RetryBackoffPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  factor: number;
  maxDelayMs: number;
  jitterRatio: number;
}

export interface RetryWithBackoffOptions {
  policy?: Partial<RetryBackoffPolicy> | undefined;
  shouldRetry?: ((error: unknown, attempt: number) => boolean | Promise<boolean>) | undefined;
  sleepFn?: ((delayMs: number) => Promise<void>) | undefined;
}

const defaultPolicy: RetryBackoffPolicy = {
  maxAttempts: 3,
  initialDelayMs: 250,
  factor: 2,
  maxDelayMs: 4000,
  jitterRatio: 0.2
};

const defaultSleep = async (delayMs: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

const computeDelayMs = (attempt: number, policy: RetryBackoffPolicy): number => {
  const exponential = policy.initialDelayMs * policy.factor ** Math.max(0, attempt - 1);
  const bounded = clamp(exponential, 0, policy.maxDelayMs);
  if (policy.jitterRatio <= 0) {
    return bounded;
  }

  const jitterRange = bounded * policy.jitterRatio;
  const jitter = (Math.random() * 2 - 1) * jitterRange;
  return Math.max(0, Math.round(bounded + jitter));
};

export const retryWithBackoff = async <T>(
  task: () => Promise<T>,
  options: RetryWithBackoffOptions = {}
): Promise<T> => {
  const policy: RetryBackoffPolicy = {
    ...defaultPolicy,
    ...(options.policy ?? {})
  };
  const shouldRetry =
    options.shouldRetry ??
    (async () => {
      return true;
    });
  const sleepFn = options.sleepFn ?? defaultSleep;

  let lastError: unknown;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
    try {
      return await task();
    } catch (error) {
      lastError = error;
      if (attempt >= policy.maxAttempts) {
        break;
      }
      const retryable = await shouldRetry(error, attempt);
      if (!retryable) {
        break;
      }
      const delayMs = computeDelayMs(attempt, policy);
      await sleepFn(delayMs);
    }
  }

  throw lastError;
};
