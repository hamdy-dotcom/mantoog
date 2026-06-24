import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

function createLimiter(requests: number, window: `${number} ${'ms' | 's' | 'm' | 'h' | 'd'}`) {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  return new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(requests, window),
    ephemeralCache: new Map(),
    prefix: 'rl',
  })
}

// 60 orders / minute / IP — high enough for viral COD spikes, stops automated drain loops
export const orderLimiter = createLimiter(60, '1 m')

// 120 track-visit hits / minute / IP
export const visitLimiter = createLimiter(120, '1 m')

export async function checkLimit(
  limiter: Ratelimit | null,
  key: string,
): Promise<boolean> {
  if (!limiter) return true // fail-open when Redis not configured
  try {
    const { success } = await limiter.limit(key)
    return success
  } catch {
    return true // fail-open on Redis errors — never block a real order
  }
}
