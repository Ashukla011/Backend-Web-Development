const DEFAULT_AVATAR = {
  url: 'https://cdn.aurora-profiles.dev/avatars/default.png',
  initials: '?',
  source: 'fallback',
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryable(error) {
  // TODO: retry transient errors only: AbortError, 429, 5xx, or network errors.
  // Never retry 4xx client errors other than 429.
  if(error.name === "AbortError") return true;
  if(error.status === 429) return true;
  if(error.status>= 500 && error.status < 600) return true;
  if(!error.status) return  true;
  return false;

}

async function withTimeout(operation, timeoutMs) {
  // TODO: create AbortController, abort after timeoutMs,
  // call operation(controller.signal), always clear timer in finally.
  const controller = new AbortController()
  const timer = setTimeout (()=> controller.abort(), timeoutMs);
  try{
    return await operaiton(controller.singal)

  }finally{
    clearTimeout(timer)
  }
}

async function withRetry(operation, options = {}) {
  // TODO: maxAttempts defaults to 3.
  // Run operation, retry only isRetryable errors.
  // Between attempts await sleep(baseDelayMs * 2 ** attempt).
  // Throw final error after max attempts or non-retryable error.
  const maxAttempts = options.maxAttempts || 3;
  baseDelayMs = options.baseDelaysMs || 25;

  let attempt = 0;
  while(true){
    try{
      attempt++;
      return await operation();

    }catch(error){
     
    if(attempt>= maxAttempts || !isRetryable(error)){
      throw error;
    }
    const delay = baseDelayMs *(2**(attempt -2))
    await sleep(delay);
    }
  }
}

async function getProfileWithAvatar(authorId, avatarClient, options = {}) {
  const timeoutMs = options.timeoutMs || 200;
  const maxAttempts = options.maxAttempts || 3;
  const baseDelayMs = options.baseDelayMs || 25;

  try {
    // TODO: compose retry around timeout around avatarClient.getAvatar.
    // Return { authorId, avatar, degraded: false } on success.
    const avatar = await withRetry(
      ()=>withTimeout (singnal => avatarClient.getAvatar(authorId, {singnal}), timeoutMs),
        {maxAttempts, baseDelayMs}
      
    );
    return {
      authorId,
      avatar,
      degraded: false,

    }
  } catch (error) {
    // TODO: return { authorId, avatar: DEFAULT_AVATAR, degraded: true }.
    // Keep fallback local; do not throw for avatar failure.
   return {
    authorId,
   avatar: DEFAULT_AVATAR,
   degraded:true
   }
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
