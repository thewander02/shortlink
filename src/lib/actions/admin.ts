import { prisma } from '../prisma';
import { cacheIpBlock, removeIpBlock } from '../cache';
import { createHash, timingSafeEqual } from 'crypto';
import {
	MAX_PAGE,
	MAX_LIMIT,
	MIN_PAGE,
	MIN_LIMIT,
	MAX_SEARCH_QUERY_LENGTH,
	MAX_IP_BLOCK_DURATION_HOURS,
	MIN_IP_BLOCK_DURATION_HOURS,
	MAX_REASON_LENGTH,
	MIN_IP_BLOCK_REASON_LENGTH,
	MIN_ADMIN_KEY_LENGTH,
	ONE_DAY_MS,
	MAX_SHORT_CODE_LENGTH
} from '../constants';

/**
 * Validate admin access with timing attack protection
 */
export async function validateAdminAccess(key: string): Promise<boolean> {
	const adminKey = process.env.ADMIN_SECRET_KEY;
	if (!adminKey || adminKey.length < MIN_ADMIN_KEY_LENGTH) {
		console.error('Admin key not set or too short');
		return false;
	}

	if (key.length !== adminKey.length) {
		const keyHash = createHash('sha256').update(key).digest();
		const adminKeyHash = createHash('sha256').update(adminKey).digest();
		return timingSafeEqual(keyHash, adminKeyHash);
	}

	const keyHash = createHash('sha256').update(key).digest();
	const adminKeyHash = createHash('sha256').update(adminKey).digest();
	return timingSafeEqual(keyHash, adminKeyHash);
}

/**
 * Validate IP address format
 */
function isValidIpAddress(ip: string): boolean {
	if (!ip || typeof ip !== 'string' || ip.length > 45) {
		return false;
	}

	const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
	if (ipv4Regex.test(ip)) {
		const parts = ip.split('.');
		return parts.every((part) => {
			const num = parseInt(part, 10);
			return num >= 0 && num <= 255;
		});
	}

	const ipv6Regex = /^([0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
	if (ipv6Regex.test(ip)) {
		return true;
	}

	if (ip.startsWith('[') && ip.endsWith(']')) {
		const inner = ip.slice(1, -1);
		return ipv6Regex.test(inner);
	}

	return false;
}

/**
 * Check if IP is internal/localhost (should not be blocked)
 */
function isInternalIp(ip: string): boolean {
	if (!ip) return false;

	if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
		return true;
	}

	// RFC 1918 private IPv4 ranges
	if (/^10\./.test(ip) || /^172\.(1[6-9]|2[0-9]|3[01])\./.test(ip) || /^192\.168\./.test(ip)) {
		return true;
	}

	// Private IPv6 ranges (ULA and link-local)
	if (
		/^fc00:/i.test(ip) ||
		/^fe80:/i.test(ip) ||
		/^::ffff:(10\.|172\.(1[6-9]|2[0-9]|3[01])\.|192\.168\.)/i.test(ip)
	) {
		return true;
	}

	return false;
}

/**
 * Validate UUID format
 */
function isValidUUID(id: string): boolean {
	if (!id || typeof id !== 'string') return false;
	const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
	return uuidRegex.test(id) && id.length === 36;
}

/**
 * Sanitize and validate search query
 */
function sanitizeSearchQuery(query: string | undefined): string | undefined {
	if (!query || typeof query !== 'string') return undefined;
	const sanitized = query.trim().substring(0, MAX_SEARCH_QUERY_LENGTH);
	return sanitized || undefined;
}

/**
 * Validate and clamp pagination parameters
 * @param page - Page number (1-indexed)
 * @param limit - Number of items per page
 * @returns Validated page and limit values within allowed ranges
 */
function validatePagination(
	page: number | undefined,
	limit: number | undefined
): { page: number; limit: number } {
	const validPage = Math.max(MIN_PAGE, Math.min(MAX_PAGE, Math.floor(page || MIN_PAGE)));
	const validLimit = Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.floor(limit || 50)));
	return { page: validPage, limit: validLimit };
}

/**
 * Get system statistics
 * @param adminKey - Admin authentication key
 * @returns System statistics object or null if access denied
 */
export async function getSystemStats(adminKey: string) {
	if (!(await validateAdminAccess(adminKey))) {
		return null;
	}

	try {
		const [
			totalUrls,
			totalClicks,
			totalVisits,
			activeUsers,
			blockedIps,
			pendingReports,
			pendingAppeals,
			pendingIpAppeals
		] = await Promise.all([
			prisma.link.count(),
			prisma.linkAnalytics.aggregate({
				_sum: { clicks: true }
			}),
			prisma.visit.count(),
			prisma.link.groupBy({
				by: ['ipAddress'],
				where: {
					createdAt: {
						gte: new Date(Date.now() - ONE_DAY_MS)
					}
				}
			}),
			prisma.ipBlock.count({
				where: { status: 'active' }
			}),
			prisma.report.count({
				where: { status: 'pending' }
			}),
			prisma.appeal.count({
				where: { status: 'pending' }
			}),
			prisma.ipAppeal.count({
				where: { status: 'pending' }
			})
		]);

		const panicMode = await prisma.systemSetting.findUnique({
			where: { key: 'panic_mode' }
		});

		return {
			totalUrls,
			totalClicks: totalClicks._sum.clicks || 0,
			totalVisits,
			activeUsers: activeUsers.length,
			blockedIps,
			pendingReports,
			pendingAppeals,
			pendingIpAppeals,
			panicMode: panicMode?.value === 'true'
		};
	} catch (error) {
		console.error('Error getting system stats:', error);
		return null;
	}
}

/**
 * Get recent activity (links, visits, reports)
 * @param adminKey - Admin authentication key
 * @param limit - Maximum number of items to return (default: 20, max: 100)
 * @returns Object containing recent links, visits, and reports
 */
export async function getRecentActivity(adminKey: string, limit = 20) {
	if (!(await validateAdminAccess(adminKey))) {
		return { recentLinks: [], recentVisits: [], recentReports: [] };
	}

	try {
		const validLimit = Math.max(1, Math.min(100, Math.floor(limit || 20)));

		const [recentLinks, recentVisits, recentReports] = await Promise.all([
			prisma.link.findMany({
				orderBy: { createdAt: 'desc' },
				take: validLimit,
				include: {
					analytics: true
				}
			}),
			prisma.visit.findMany({
				orderBy: { timestamp: 'desc' },
				take: validLimit,
				include: {
					link: {
						select: {
							shortCode: true,
							originalUrl: true
						}
					}
				}
			}),
			prisma.report.findMany({
				where: { status: 'pending' },
				orderBy: { createdAt: 'desc' },
				take: validLimit,
				include: {
					link: {
						select: {
							shortCode: true,
							originalUrl: true
						}
					}
				}
			})
		]);

		return {
			recentLinks,
			recentVisits,
			recentReports
		};
	} catch (error) {
		console.error('Error getting recent activity:', error);
		return {
			recentLinks: [],
			recentVisits: [],
			recentReports: []
		};
	}
}

/**
 * Get all reported URLs with pending status
 * @param adminKey - Admin authentication key
 * @returns Array of pending reports with link information
 */
export async function getReportedUrls(adminKey: string) {
	if (!(await validateAdminAccess(adminKey))) {
		return [];
	}

	try {
		return await prisma.report.findMany({
			where: { status: 'pending' },
			orderBy: { createdAt: 'desc' },
			include: {
				link: {
					select: {
						shortCode: true,
						originalUrl: true,
						createdAt: true
					}
				}
			}
		});
	} catch (error) {
		console.error('Error getting reported URLs:', error);
		return [];
	}
}

/**
 * Resolve a report (approve or reject)
 * @param adminKey - Admin authentication key
 * @param reportId - UUID of the report to resolve
 * @param action - 'approve' marks link as malicious, 'reject' dismisses the report
 * @returns true if successful, false otherwise
 */
export async function resolveReport(
	adminKey: string,
	reportId: string,
	action: 'approve' | 'reject'
): Promise<boolean> {
	if (!(await validateAdminAccess(adminKey))) {
		return false;
	}

	if (!isValidUUID(reportId)) {
		return false;
	}

	if (action !== 'approve' && action !== 'reject') {
		return false;
	}

	try {
		const report = await prisma.report.findUnique({
			where: { id: reportId }
		});

		if (!report) {
			return false;
		}

		if (report.status !== 'pending') {
			return false;
		}

		if (action === 'approve') {
			await prisma.link.update({
				where: { shortCode: report.shortCode },
				data: { isMalicious: true }
			});
		}

		await prisma.report.update({
			where: { id: reportId },
			data: {
				status: action === 'approve' ? 'approved' : 'rejected',
				resolvedAt: new Date()
			}
		});

		return true;
	} catch (error) {
		console.error('Error resolving report:', error);
		return false;
	}
}

/**
 * Get all currently blocked IP addresses
 * @param adminKey - Admin authentication key
 * @returns Array of active IP blocks
 */
export async function getBlockedIPs(adminKey: string) {
	if (!(await validateAdminAccess(adminKey))) {
		return [];
	}

	try {
		return await prisma.ipBlock.findMany({
			where: { status: 'active' },
			orderBy: { blockedAt: 'desc' }
		});
	} catch (error) {
		console.error('Error getting blocked IPs:', error);
		return [];
	}
}

/**
 * Block an IP address
 * @param adminKey - Admin authentication key
 * @param ipAddress - IP address to block (IPv4 or IPv6)
 * @param reason - Reason for blocking (3-500 characters)
 * @param durationHours - Block duration in hours (1-720, default: 24)
 * @returns true if successful, false otherwise
 */
export async function blockIp(
	adminKey: string,
	ipAddress: string,
	reason: string,
	durationHours = 24
): Promise<boolean> {
	if (!(await validateAdminAccess(adminKey))) {
		return false;
	}

	if (!isValidIpAddress(ipAddress)) {
		return false;
	}

	// Prevent blocking internal/localhost IPs
	if (isInternalIp(ipAddress)) {
		return false;
	}

	const validDuration = Math.max(
		MIN_IP_BLOCK_DURATION_HOURS,
		Math.min(MAX_IP_BLOCK_DURATION_HOURS, Math.floor(durationHours || 24))
	);

	const validReason = reason?.trim().substring(0, MAX_REASON_LENGTH) || 'No reason provided';
	if (!validReason || validReason.length < MIN_IP_BLOCK_REASON_LENGTH) {
		return false;
	}

	try {
		const expiresAt = new Date(Date.now() + validDuration * 60 * 60 * 1000);

		await prisma.ipBlock.upsert({
			where: { ipAddress },
			update: {
				reason: validReason,
				expiresAt,
				status: 'active',
				blockedAt: new Date()
			},
			create: {
				ipAddress,
				reason: validReason,
				expiresAt,
				status: 'active'
			}
		});

		await cacheIpBlock(ipAddress, validDuration * 60 * 60);

		return true;
	} catch (error) {
		console.error('Error blocking IP:', error);
		return false;
	}
}

/**
 * Unblock an IP address
 * @param adminKey - Admin authentication key
 * @param ipAddress - IP address to unblock
 * @returns true if successful, false otherwise
 */
export async function unblockIp(adminKey: string, ipAddress: string): Promise<boolean> {
	if (!(await validateAdminAccess(adminKey))) {
		return false;
	}

	if (!isValidIpAddress(ipAddress)) {
		return false;
	}

	try {
		const result = await prisma.ipBlock.update({
			where: { ipAddress },
			data: { status: 'removed' }
		});

		if (result) {
			await removeIpBlock(ipAddress);
		}

		return true;
	} catch (error) {
		// P2025 = record not found - consider it already unblocked
		if ((error as { code?: string }).code === 'P2025') {
			return true;
		}
		console.error('Error unblocking IP:', error);
		return false;
	}
}

/**
 * Get all pending appeals (URL and IP appeals)
 * @param adminKey - Admin authentication key
 * @returns Object containing arrays of URL appeals and IP appeals
 */
export async function getPendingAppeals(adminKey: string) {
	if (!(await validateAdminAccess(adminKey))) {
		return { urlAppeals: [], ipAppeals: [] };
	}

	try {
		const [urlAppeals, ipAppeals] = await Promise.all([
			prisma.appeal.findMany({
				where: { status: 'pending' },
				orderBy: { createdAt: 'desc' },
				include: {
					link: {
						select: {
							shortCode: true,
							originalUrl: true
						}
					}
				}
			}),
			prisma.ipAppeal.findMany({
				where: { status: 'pending' },
				orderBy: { createdAt: 'desc' }
			})
		]);

		return { urlAppeals, ipAppeals };
	} catch (error) {
		console.error('Error getting appeals:', error);
		return { urlAppeals: [], ipAppeals: [] };
	}
}

/**
 * Resolve an appeal (approve or reject)
 * @param adminKey - Admin authentication key
 * @param appealId - UUID of the appeal to resolve
 * @param appealType - Type of appeal: 'url' or 'ip'
 * @param action - 'approve' grants the appeal, 'reject' denies it
 * @returns true if successful, false otherwise
 */
export async function resolveAppeal(
	adminKey: string,
	appealId: string,
	appealType: 'url' | 'ip',
	action: 'approve' | 'reject'
): Promise<boolean> {
	if (!(await validateAdminAccess(adminKey))) {
		return false;
	}

	if (!isValidUUID(appealId)) {
		return false;
	}

	if (appealType !== 'url' && appealType !== 'ip') {
		return false;
	}

	if (action !== 'approve' && action !== 'reject') {
		return false;
	}

	try {
		if (appealType === 'url') {
			const appeal = await prisma.appeal.findUnique({
				where: { id: appealId }
			});

			if (!appeal) {
				return false;
			}

			if (appeal.status !== 'pending') {
				return false;
			}

			if (action === 'approve') {
				await prisma.link.update({
					where: { shortCode: appeal.shortCode },
					data: { isMalicious: false }
				});
			}

			await prisma.appeal.update({
				where: { id: appealId },
				data: {
					status: action === 'approve' ? 'approved' : 'rejected',
					resolvedAt: new Date()
				}
			});
		} else {
			const appeal = await prisma.ipAppeal.findUnique({
				where: { id: appealId }
			});

			if (!appeal) {
				return false;
			}

			if (appeal.status !== 'pending') {
				return false;
			}

			if (action === 'approve') {
				await unblockIp(adminKey, appeal.ipAddress);
			}

			await prisma.ipAppeal.update({
				where: { id: appealId },
				data: {
					status: action === 'approve' ? 'approved' : 'rejected',
					resolvedAt: new Date()
				}
			});
		}

		return true;
	} catch (error) {
		console.error('Error resolving appeal:', error);
		return false;
	}
}

/**
 * Get all links with pagination and optional search
 * @param adminKey - Admin authentication key
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 50, max: 100)
 * @param search - Optional search query for shortCode or originalUrl
 * @returns Object containing links array and total count
 */
export async function getAllLinks(adminKey: string, page = 1, limit = 50, search?: string) {
	if (!(await validateAdminAccess(adminKey))) {
		return { links: [], total: 0 };
	}

	try {
		const { page: validPage, limit: validLimit } = validatePagination(page, limit);
		const sanitizedSearch = sanitizeSearchQuery(search);

		const skip = (validPage - 1) * validLimit;
		const where = sanitizedSearch
			? {
					OR: [
						{ shortCode: { contains: sanitizedSearch, mode: 'insensitive' as const } },
						{ originalUrl: { contains: sanitizedSearch, mode: 'insensitive' as const } }
					]
				}
			: {};

		const [links, total] = await Promise.all([
			prisma.link.findMany({
				where,
				include: {
					analytics: true
				},
				orderBy: { createdAt: 'desc' },
				skip,
				take: validLimit
			}),
			prisma.link.count({ where })
		]);

		return { links, total };
	} catch (error) {
		console.error('Error getting links:', error);
		return { links: [], total: 0 };
	}
}

/**
 * Delete a link (admin only)
 * @param adminKey - Admin authentication key
 * @param shortCode - Short code of the link to delete
 * @returns true if successful, false otherwise
 */
export async function deleteLinkAdmin(adminKey: string, shortCode: string): Promise<boolean> {
	if (!(await validateAdminAccess(adminKey))) {
		return false;
	}

	if (!shortCode || typeof shortCode !== 'string' || shortCode.length > MAX_SHORT_CODE_LENGTH) {
		return false;
	}

	const sanitized = shortCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');
	if (!sanitized || sanitized.length < 1) {
		return false;
	}

	try {
		await prisma.link.delete({
			where: { shortCode: sanitized }
		});

		return true;
	} catch (error) {
		// P2025 = record not found - consider it already deleted
		if ((error as { code?: string }).code === 'P2025') {
			return true;
		}
		console.error('Error deleting link:', error);
		return false;
	}
}

/**
 * Toggle panic mode (disables URL shortening when enabled)
 * @param adminKey - Admin authentication key
 * @param enabled - Whether to enable or disable panic mode
 * @returns true if successful, false otherwise
 */
export async function togglePanicMode(adminKey: string, enabled: boolean): Promise<boolean> {
	if (!(await validateAdminAccess(adminKey))) {
		return false;
	}

	try {
		await prisma.systemSetting.upsert({
			where: { key: 'panic_mode' },
			update: { value: enabled ? 'true' : 'false' },
			create: { key: 'panic_mode', value: enabled ? 'true' : 'false' }
		});

		return true;
	} catch (error) {
		console.error('Error toggling panic mode:', error);
		return false;
	}
}
