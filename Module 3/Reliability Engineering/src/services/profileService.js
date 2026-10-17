const DEFAULT_AVATAR = {
  url: 'https://cdn.aurora-profiles.dev/avatars/default.png',
  initials: '?',
  source: 'fallback',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(error) {
  // Retry AbortError, rate limits (429), server errors (5xx), or network errors (no status)
  if (error.name === 'AbortError') return true;
  if (error.status === 429) return true;
  if (error.status >= 500 && error.status < 600) return true;
  if (!error.status) return true; // Network/fetch connection errors
  return false;
}

async function withTimeout(operation, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await operation(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function withRetry(operation, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  const baseDelayMs = options.baseDelayMs || 25;

  let attempt = 0;
  while (true) {
    attempt++;
    try {
      return await operation();
    } catch (error) {
      if (attempt >= maxAttempts || !isRetryable(error)) {
        throw error;
      }
      const delay = baseDelayMs * (2 ** (attempt - 1));
      await sleep(delay);
    }
  }
}

async function getProfileWithAvatar(authorId, avatarClient, options = {}) {
  const timeoutMs = options.timeoutMs || 200;
  const maxAttempts = options.maxAttempts || 3;
  const baseDelayMs = options.baseDelayMs || 25;

  try {
    const avatar = await withRetry(
      () => withTimeout(
        (signal) => avatarClient.getAvatar(authorId, { signal }),
        timeoutMs
      ),
      { maxAttempts, baseDelayMs }
    );

    return { authorId, avatar, degraded: false };
  } catch (error) {
    return { authorId, avatar: DEFAULT_AVATAR, degraded: true };
  }
}

module.exports = {
  DEFAULT_AVATAR,
  sleep,
  isRetryable,
  withTimeout,
  withRetry,
  getProfileWithAvatar,
};