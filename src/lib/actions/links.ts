import { nanoid } from 'nanoid';
import { prisma } from '../prisma';
import { cacheLink, getCachedLink, invalidateLinkCache, isIpBlocked } from '../cache';
import { checkUrlSafety } from '../url-safety';
import { isValidUrl, normalizeUrl } from '../utils/ip';
import type { RequestEvent } from '@sveltejs/kit';
import { getClientIp } from '../utils/ip';
import { getUserIdFromRequest, USER_ID_STORAGE_KEY } from '../utils/user-id';
import {
	MAX_URL_LENGTH,
	MAX_SHORT_CODE_LENGTH,
	MAX_REASON_LENGTH,
	MAX_REPORT_REASON_LENGTH,
	MIN_REASON_LENGTH,
	MAX_CONTACT_INFO_LENGTH,
	MAX_CATEGORY_LENGTH,
	MAX_DESCRIPTION_LENGTH,
	SHORT_CODE_LENGTH,
	ONE_DAY_MS,
	ONE_HOUR_MS,
	AUTO_FLAG_REPORT_COUNT,
	AUTO_FLAG_MIN_UNIQUE_IPS,
	ONE_YEAR_MS
} from '../constants';

/**
 * Check if an error is related to userId field not existing (migration compatibility)
 */
function isUserIdFieldError(error: unknown): boolean {
	if (!error || typeof error !== 'object') return false;
	const message = (error as { message?: string }).message || '';
	return message.includes('userId') || message.includes('Unknown argument');
}

/**
 * Shorten a URL with safety checks and validation
 * @param originalUrl - The URL to shorten
 * @param event - SvelteKit request event
 * @returns Shortened URL or throws error if validation fails
 * @throws Error if URL is invalid, too long, malicious, or user is blocked
 */
export async function shortenUrl(originalUrl: string, event: RequestEvent): Promise<string> {
	try {
		if (!originalUrl || typeof originalUrl !== 'string' || originalUrl.length > MAX_URL_LENGTH) {
			throw new Error(`URL is too long (maximum ${MAX_URL_LENGTH} characters)`);
		}

		originalUrl = normalizeUrl(originalUrl);

		if (!isValidUrl(originalUrl)) {
			throw new Error('Invalid URL provided');
		}

		const ipAddress = getClientIp(event);

		if (await isIpBlocked(ipAddress)) {
			throw new Error('Your IP address has been blocked due to suspicious activity');
		}

		const userId = await getUserIdFromRequest(event, ipAddress, prisma);
		const safetyCheck = await checkUrlSafety(originalUrl);

		if (!safetyCheck.safe) {
			throw new Error(
				`This URL has been flagged as potentially malicious and cannot be shortened: ${safetyCheck.reason}`
			);
		}

		// Prevent abuse by returning existing short URL for duplicates within 24 hours
		const recentDuplicate = await prisma.link.findFirst({
			where: {
				originalUrl,
				userId: userId || undefined,
				createdAt: {
					gte: new Date(Date.now() - ONE_DAY_MS)
				}
			},
			select: { shortCode: true },
			orderBy: { createdAt: 'desc' }
		});

		if (recentDuplicate) {
			const baseUrl = process.env.PUBLIC_LINK_URL || 'https://l.tw02.us';
			return `${baseUrl}/${recentDuplicate.shortCode}`;
		}

		const shortCode = nanoid(SHORT_CODE_LENGTH);

		const linkData = {
			shortCode,
			originalUrl,
			ipAddress,
			safetyScore: safetyCheck.score,
			safetyCategory: safetyCheck.category,
			safetyWarnings: JSON.stringify(safetyCheck.warnings || []),
			isMalicious: false,
			analytics: {
				create: {
					clicks: 0,
					uniqueVisitors: 0
				}
			}
		};

		let link;
		try {
			link = await prisma.link.create({
				data: { ...linkData, userId }
			});
		} catch (error) {
			if (isUserIdFieldError(error)) {
				link = await prisma.link.create({
					data: linkData
				});
			} else {
				throw error;
			}
		}

		event.cookies.set(USER_ID_STORAGE_KEY, userId, {
			path: '/',
			httpOnly: false,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: Math.floor(ONE_YEAR_MS / 1000)
		});

		await cacheLink(shortCode, originalUrl);

		const baseUrl = process.env.PUBLIC_LINK_URL || 'https://example.com';
		return `${baseUrl}/${shortCode}`;
	} catch (error) {
		console.error('Error shortening URL:', error);
		throw new Error(error instanceof Error ? error.message : 'Failed to shorten URL');
	}
}

/**
 * Resolve a short code to the original URL
 * @param shortCode - The short code to resolve
 * @param event - SvelteKit request event
 * @param shouldIncrementClicks - Whether to increment click count (default: true)
 * @returns Original URL, warning page URL if malicious, or null if not found
 */
export async function resolveUrl(
	shortCode: string,
	event: RequestEvent,
	shouldIncrementClicks = true
): Promise<string | null> {
	try {
		shortCode = shortCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');

		if (!shortCode) {
			return null;
		}

		const ipAddress = getClientIp(event);

		if (await isIpBlocked(ipAddress)) {
			console.warn(`Blocked IP ${ipAddress} attempted to resolve URL ${shortCode}`);
			return null;
		}

		let originalUrl = await getCachedLink(shortCode);

		if (!originalUrl) {
			const link = await prisma.link.findUnique({
				where: { shortCode },
				select: {
					originalUrl: true,
					isMalicious: true,
					expiresAt: true
				}
			});

			if (!link) {
				return null;
			}

			if (link.expiresAt && link.expiresAt < new Date()) {
				return null;
			}

			originalUrl = link.originalUrl;
			await cacheLink(shortCode, originalUrl);

			if (link.isMalicious) {
				const baseUrl = process.env.PUBLIC_LINK_URL || 'https://example.com';
				return `${baseUrl}/warning?code=${shortCode}`;
			}
		} else {
			const link = await prisma.link.findUnique({
				where: { shortCode },
				select: { isMalicious: true }
			});

			if (link?.isMalicious) {
				const baseUrl = process.env.PUBLIC_LINK_URL || 'https://example.com';
				return `${baseUrl}/warning?code=${shortCode}`;
			}
		}

		if (shouldIncrementClicks) {
			incrementClickCount(shortCode, ipAddress, event).catch((error) => {
				console.error('Error updating analytics:', error);
			});
		}

		return originalUrl;
	} catch (error) {
		console.error('Error resolving URL:', error);
		return null;
	}
}

/**
 * Increment click count and log visit (async)
 */
async function incrementClickCount(
	shortCode: string,
	ipAddress: string,
	event: RequestEvent
): Promise<void> {
	try {
		const userAgent = event.request.headers.get('user-agent') || 'unknown';
		const referer = event.request.headers.get('referer') || 'direct';

		await prisma.$transaction(async (tx) => {
			const link = await tx.link.findUnique({
				where: { shortCode },
				select: { id: true }
			});

			if (!link) {
				return;
			}

			const analytics = await tx.linkAnalytics.upsert({
				where: {
					linkId: link.id
				},
				update: {
					clicks: { increment: 1 },
					lastClickedAt: new Date()
				},
				create: {
					linkId: link.id,
					clicks: 1,
					lastClickedAt: new Date()
				}
			});

			const existingVisit = await tx.visit.findFirst({
				where: {
					linkId: link.id,
					ipAddress
				}
			});

			if (!existingVisit) {
				await tx.linkAnalytics.update({
					where: { id: analytics.id },
					data: {
						uniqueVisitors: { increment: 1 }
					}
				});
			}

			await tx.visit.create({
				data: {
					linkId: link.id,
					ipAddress,
					userAgent,
					referer
				}
			});
		});
	} catch (error) {
		console.error('Error incrementing click count:', error);
	}
}

/**
 * Get URL analytics data
 * @param shortCode - The short code to get analytics for
 * @returns Analytics data object or null if not found
 */
export async function getUrlAnalytics(shortCode: string): Promise<{
	clicks: number;
	createdAt: string;
	originalUrl?: string;
	ipAddress?: string;
	safetyScore?: number;
	safetyWarnings?: string[];
	safetyCategory?: string;
	uniqueVisitors?: number;
} | null> {
	try {
		shortCode = shortCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');

		if (!shortCode) {
			return null;
		}

		const link = await prisma.link.findUnique({
			where: { shortCode },
			include: {
				analytics: true
			}
		});

		if (!link) {
			return null;
		}

		return {
			clicks: link.analytics?.clicks || 0,
			createdAt: link.createdAt.toISOString(),
			originalUrl: link.originalUrl,
			ipAddress: link.ipAddress || undefined,
			safetyScore: link.safetyScore || undefined,
			safetyWarnings: link.safetyWarnings
				? (JSON.parse(link.safetyWarnings) as string[])
				: undefined,
			safetyCategory: link.safetyCategory || undefined,
			uniqueVisitors: link.analytics?.uniqueVisitors || 0
		};
	} catch (error) {
		console.error('Error getting URL analytics:', error);
		return null;
	}
}

/**
 * Get user's URL history (UUID-based with IP fallback)
 * @param event - SvelteKit request event
 * @returns Array of user's shortened URLs with analytics
 */
export async function getUserHistory(event: RequestEvent): Promise<
	Array<{
		shortCode: string;
		originalUrl: string;
		shortUrl: string;
		createdAt: string;
		clicks: number;
		uniqueVisitors?: number;
	}>
> {
	try {
		const ipAddress = getClientIp(event);

		if (ipAddress !== 'unknown') {
			const blocked = await isIpBlocked(ipAddress);
			if (blocked) {
				return [];
			}
		}

		const cookieUserId = event.cookies.get(USER_ID_STORAGE_KEY);
		const hasUserId =
			cookieUserId &&
			/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cookieUserId);

		if (!hasUserId) {
			return [];
		}

		const userId = await getUserIdFromRequest(event, ipAddress, prisma);

		type LinkWithAnalytics = {
			shortCode: string;
			originalUrl: string;
			createdAt: Date;
			analytics: {
				clicks: number;
				uniqueVisitors: number;
			} | null;
		};

		const queryOptions = {
			include: { analytics: true },
			orderBy: { createdAt: 'desc' as const },
			take: 50
		};

		let links: LinkWithAnalytics[] = [];
		try {
			const linksByUserId = await prisma.link.findMany({
				where: { userId },
				...queryOptions
			});

			if (linksByUserId.length > 0) {
				links = linksByUserId as LinkWithAnalytics[];
			} else if (ipAddress !== 'unknown') {
				const linksByIp = await prisma.link.findMany({
					where: {
						ipAddress,
						userId: null
					},
					...queryOptions
				});
				links = linksByIp as LinkWithAnalytics[];
			}
		} catch (error) {
			if (isUserIdFieldError(error) && ipAddress !== 'unknown') {
				links = (await prisma.link.findMany({
					where: { ipAddress },
					...queryOptions
				})) as LinkWithAnalytics[];
			} else {
				console.error('Error in getUserHistory query:', error);
				throw error;
			}
		}

		const baseUrl = process.env.PUBLIC_LINK_URL || 'https://example.com';

		return links.map((link) => ({
			shortCode: link.shortCode,
			originalUrl: link.originalUrl,
			shortUrl: `${baseUrl}/${link.shortCode}`,
			createdAt: link.createdAt.toISOString(),
			clicks: link.analytics?.clicks || 0,
			uniqueVisitors: link.analytics?.uniqueVisitors || 0
		}));
	} catch (error) {
		console.error('Error getting user history:', error);
		return [];
	}
}

/**
 * Delete a short URL (only if user owns it)
 * @param shortCode - The short code to delete
 * @param event - SvelteKit request event
 * @returns true if successful, false if not found or unauthorized
 */
export async function deleteShortUrl(shortCode: string, event: RequestEvent): Promise<boolean> {
	try {
		shortCode = shortCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');

		if (!shortCode) {
			return false;
		}

		const ipAddress = getClientIp(event);

		if (await isIpBlocked(ipAddress)) {
			return false;
		}

		const userId = await getUserIdFromRequest(event, ipAddress, prisma);

		type LinkSelect = { ipAddress: string | null; userId?: string | null };
		let link: LinkSelect;
		try {
			link = (await prisma.link.findUnique({
				where: { shortCode },
				select: { ipAddress: true, userId: true }
			})) as LinkSelect;
		} catch (error) {
			if (isUserIdFieldError(error)) {
				link = (await prisma.link.findUnique({
					where: { shortCode },
					select: { ipAddress: true }
				})) as { ipAddress: string | null };
			} else {
				throw error;
			}
		}

		if (!link) {
			return false;
		}

		const linkUserId = link.userId;
		if (linkUserId !== userId && link.ipAddress !== ipAddress) {
			return false;
		}

		await prisma.link.delete({
			where: { shortCode }
		});

		await invalidateLinkCache(shortCode);

		return true;
	} catch (error) {
		console.error('Error deleting short URL:', error);
		return false;
	}
}

/**
 * Report a malicious URL
 * @param shortCode - The short code to report
 * @param reason - Reason for reporting (10-500 characters)
 * @param event - SvelteKit request event
 * @param reporterInfo - Optional additional reporter information
 * @returns true if successful, false otherwise
 */
export async function reportMaliciousUrl(
	shortCode: string,
	reason: string,
	event: RequestEvent,
	reporterInfo?: {
		email?: string;
		category?: string;
		description?: string;
	}
): Promise<boolean> {
	try {
		shortCode = shortCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');
		reason = reason.trim().substring(0, MAX_REPORT_REASON_LENGTH);

		if (!shortCode || !reason || shortCode.length < 1 || reason.length < MIN_REASON_LENGTH) {
			return false;
		}

		const ipAddress = getClientIp(event);

		const link = await prisma.link.findUnique({
			where: { shortCode }
		});

		if (!link) {
			return false;
		}

		// Prevent duplicate reports from same IP within 1 hour
		const recentReport = await prisma.report.findFirst({
			where: {
				shortCode,
				reporterIp: ipAddress,
				createdAt: {
					gte: new Date(Date.now() - ONE_HOUR_MS)
				}
			}
		});

		if (recentReport) {
			return false;
		}

		await prisma.report.create({
			data: {
				shortCode,
				reason,
				reporterIp: ipAddress,
				category: (reporterInfo?.category || 'other').substring(0, MAX_CATEGORY_LENGTH),
				description: (reporterInfo?.description || '').substring(0, MAX_DESCRIPTION_LENGTH),
				status: 'pending'
			}
		});

		const reportCount = await prisma.report.count({
			where: {
				shortCode,
				status: 'pending'
			}
		});

		// Auto-flag after threshold pending reports from multiple unique IPs to prevent abuse
		if (reportCount >= AUTO_FLAG_REPORT_COUNT) {
			const uniqueReporterCount = await prisma.report.groupBy({
				by: ['reporterIp'],
				where: {
					shortCode,
					status: 'pending'
				}
			});

			if (uniqueReporterCount.length >= AUTO_FLAG_MIN_UNIQUE_IPS) {
				await prisma.link.update({
					where: { shortCode },
					data: { isMalicious: true }
				});

				await invalidateLinkCache(shortCode);
			}
		}

		return true;
	} catch (error) {
		console.error('Error reporting malicious URL:', error);
		return false;
	}
}

/**
 * Check if a URL is marked as malicious
 * @param shortCode - The short code to check
 * @returns true if malicious, false otherwise
 */
export async function isUrlMalicious(shortCode: string): Promise<boolean> {
	try {
		shortCode = shortCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');

		if (!shortCode) {
			return false;
		}

		const link = await prisma.link.findUnique({
			where: { shortCode },
			select: { isMalicious: true }
		});

		return link?.isMalicious || false;
	} catch (error) {
		console.error('Error checking if URL is malicious:', error);
		return false;
	}
}
