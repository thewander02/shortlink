import { redis, isRedisAvailable } from './redis';
import { CACHE_TTL_LINK, CACHE_TTL_ANALYTICS } from './constants';

/**
 * Cache a link lookup (shortCode -> originalUrl)
 */
export async function cacheLink(shortCode: string, originalUrl: string): Promise<void> {
	if (!isRedisAvailable() || !redis) return;
	try {
		await redis.set(`link:${shortCode}`, originalUrl, { ex: CACHE_TTL_LINK });
	} catch (error) {
		console.error('Error caching link:', error);
	}
}

/**
 * Get a cached link
 */
export async function getCachedLink(shortCode: string): Promise<string | null> {
	if (!isRedisAvailable() || !redis) return null;
	try {
		return await redis.get<string>(`link:${shortCode}`);
	} catch (error) {
		console.error('Error getting cached link:', error);
		return null;
	}
}

/**
 * Invalidate a cached link
 */
export async function invalidateLinkCache(shortCode: string): Promise<void> {
	if (!isRedisAvailable() || !redis) return;
	try {
		await redis.del(`link:${shortCode}`);
	} catch (error) {
		console.error('Error invalidating link cache:', error);
	}
}

/**
 * Check if IP is blocked (cached)
 */
export async function isIpBlocked(ip: string): Promise<boolean> {
	if (ip === 'unknown') return false;
	if (!isRedisAvailable()) {
		const { prisma } = await import('./prisma');
		try {
			const ipBlock = await prisma.ipBlock.findUnique({
				where: { ipAddress: ip },
				select: { status: true, expiresAt: true }
			});
			if (!ipBlock || ipBlock.status !== 'active') return false;
			if (ipBlock.expiresAt && ipBlock.expiresAt < new Date()) return false;
			return true;
		} catch (error) {
			console.error('Error checking IP block in database:', error);
			return false;
		}
	}

	if (!redis) return false;
	try {
		const blocked = await redis.get<boolean>(`blocklist:ip:${ip}`);
		return !!blocked;
	} catch (error) {
		console.error('Error checking IP blocklist:', error);
		return false;
	}
}

/**
 * Cache IP block status
 */
export async function cacheIpBlock(ip: string, duration: number = 24 * 60 * 60): Promise<void> {
	if (!isRedisAvailable() || !redis) return;
	try {
		await redis.set(`blocklist:ip:${ip}`, true, { ex: duration });
	} catch (error) {
		console.error('Error caching IP block:', error);
	}
}

/**
 * Remove IP from block cache
 */
export async function removeIpBlock(ip: string): Promise<void> {
	if (!isRedisAvailable() || !redis) return;
	try {
		await redis.del(`blocklist:ip:${ip}`);
	} catch (error) {
		console.error('Error removing IP block:', error);
	}
}

/**
 * Rate limiting utilities
 */
export async function checkRateLimit(
	ip: string,
	key: string,
	limit: number,
	windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number }> {
	if (!isRedisAvailable() || !redis) {
		// Fail open: allow requests when Redis is unavailable
		return { allowed: true, remaining: limit };
	}
	try {
		const rateLimitKey = `ratelimit:${ip}:${key}`;
		const count = await redis.incr(rateLimitKey);

		if (count === 1) {
			await redis.expire(rateLimitKey, windowSeconds);
		}

		const remaining = Math.max(0, limit - count);
		const allowed = count <= limit;

		return { allowed, remaining };
	} catch (error) {
		console.error('Error checking rate limit:', error);
		// Fail open: allow requests on error to prevent service disruption
		return { allowed: true, remaining: limit };
	}
}

/**
 * Cache analytics data
 */
export async function cacheAnalytics(
	shortCode: string,
	data: unknown,
	ttl: number = CACHE_TTL_ANALYTICS
): Promise<void> {
	if (!isRedisAvailable() || !redis) return;
	try {
		await redis.set(`analytics:${shortCode}`, JSON.stringify(data), { ex: ttl });
	} catch (error) {
		console.error('Error caching analytics:', error);
	}
}

/**
 * Get cached analytics data
 */
export async function getCachedAnalytics<T>(shortCode: string): Promise<T | null> {
	if (!isRedisAvailable() || !redis) return null;
	try {
		const data = await redis.get<string>(`analytics:${shortCode}`);
		if (data) {
			return JSON.parse(data) as T;
		}
		return null;
	} catch (error) {
		console.error('Error getting cached analytics:', error);
		return null;
	}
}

/**
 * Cache panic mode status (with short TTL for quick updates)
 */
const PANIC_MODE_CACHE_TTL = 30;
let panicModeCache: { value: boolean; expires: number } | null = null;

/**
 * Check if panic mode is enabled (cached to reduce DB queries)
 */
export async function isPanicModeEnabled(): Promise<boolean> {
	if (panicModeCache && panicModeCache.expires > Date.now()) {
		return panicModeCache.value;
	}

	if (isRedisAvailable() && redis) {
		try {
			const cached = await redis.get<string>('system:panic_mode');
			if (cached !== null) {
				const value = cached === 'true';
				panicModeCache = { value, expires: Date.now() + PANIC_MODE_CACHE_TTL * 1000 };
				return value;
			}
		} catch (error) {
			console.error('Error checking panic mode in Redis:', error);
		}
	}

	try {
		const { prisma } = await import('./prisma');
		const setting = await prisma.systemSetting.findUnique({
			where: { key: 'panic_mode' },
			select: { value: true }
		});

		const value = setting?.value === 'true';
		
		panicModeCache = { value, expires: Date.now() + PANIC_MODE_CACHE_TTL * 1000 };
		
		if (isRedisAvailable() && redis) {
			try {
				await redis.set('system:panic_mode', setting?.value || 'false', { ex: PANIC_MODE_CACHE_TTL });
			} catch (error) {
				console.error('Error caching panic mode in Redis:', error);
			}
		}

		return value;
	} catch (error) {
		console.error('Error checking panic mode in database:', error);
		// Fail open: if we can't check, don't block requests
		return false;
	}
}

/**
 * Invalidate panic mode cache (call when panic mode is toggled)
 */
export async function invalidatePanicModeCache(): Promise<void> {
	panicModeCache = null;
	if (isRedisAvailable() && redis) {
		try {
			await redis.del('system:panic_mode');
		} catch (error) {
			console.error('Error invalidating panic mode cache:', error);
		}
	}
}
