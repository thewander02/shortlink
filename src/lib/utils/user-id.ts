import type { PrismaClient } from '@prisma/client';

export const USER_ID_STORAGE_KEY = 'shortlink_user_id';

function generateUUID(): string {
	return crypto.randomUUID();
}

/**
 * Get or create user ID with fallback strategy:
 * 1. Try localStorage
 * 2. Try IP-based lookup in database
 * 3. Create new UUID
 */
export async function getOrCreateUserId(ipAddress: string, prisma: PrismaClient): Promise<string> {
	if (typeof window !== 'undefined') {
		const storedId = localStorage.getItem(USER_ID_STORAGE_KEY);
		if (storedId && isValidUUID(storedId)) {
			return storedId;
		}
	}

	if (ipAddress && ipAddress !== 'unknown' && prisma) {
		try {
			const recentLink = await prisma.link.findFirst({
				where: {
					ipAddress,
					userId: { not: null }
				},
				orderBy: {
					createdAt: 'desc'
				},
				select: {
					userId: true
				}
			});

			if (recentLink?.userId) {
				if (typeof window !== 'undefined') {
					localStorage.setItem(USER_ID_STORAGE_KEY, recentLink.userId);
				}
				return recentLink.userId;
			}
		} catch (error) {
			console.error('Error looking up user by IP:', error);
		}
	}

	const newUserId = generateUUID();

	if (typeof window !== 'undefined') {
		localStorage.setItem(USER_ID_STORAGE_KEY, newUserId);
	}

	return newUserId;
}

/**
 * Get user ID from localStorage (client-side only)
 */
export function getUserIdFromStorage(): string | null {
	if (typeof window === 'undefined') return null;
	const userId = localStorage.getItem(USER_ID_STORAGE_KEY);
	return userId && isValidUUID(userId) ? userId : null;
}

/**
 * Set user ID in localStorage (client-side only)
 */
export function setUserIdInStorage(userId: string): boolean {
	if (typeof window === 'undefined') return false;
	if (!isValidUUID(userId)) return false;
	localStorage.setItem(USER_ID_STORAGE_KEY, userId);
	return true;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(uuid);
}

/**
 * Get user ID from request (server-side)
 * Checks cookie first, then falls back to getOrCreateUserId
 */
export async function getUserIdFromRequest(
	event: { cookies: { get: (key: string) => string | undefined } },
	ipAddress: string,
	prisma: PrismaClient
): Promise<string> {
	const cookieUserId = event.cookies.get(USER_ID_STORAGE_KEY);
	if (cookieUserId && isValidUUID(cookieUserId)) {
		return cookieUserId;
	}

	if (ipAddress && ipAddress !== 'unknown' && prisma) {
		try {
			const recentLink = await prisma.link.findFirst({
				where: {
					ipAddress,
					userId: { not: null }
				},
				orderBy: {
					createdAt: 'desc'
				},
				select: {
					userId: true
				}
			});

			if (recentLink?.userId) {
				return recentLink.userId;
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error);
			if (!errorMessage.includes('userId') && !errorMessage.includes('Unknown argument')) {
				console.error('Error looking up user by IP:', error);
			}
		}
	}

	return generateUUID();
}
