import { type RequestEvent } from '@sveltejs/kit';

/**
 * Get client IP address from request headers
 */
export function getClientIp(event: RequestEvent): string {
	const forwardedFor = event.request.headers.get('x-forwarded-for');
	if (forwardedFor) {
		// x-forwarded-for may contain multiple IPs (proxy chain), use the first (original client)
		return forwardedFor.split(',')[0].trim();
	}

	const realIp = event.request.headers.get('x-real-ip');
	if (realIp) {
		return realIp;
	}

	return 'unknown';
}

/**
 * Validate URL format
 */
export function isValidUrl(url: string): boolean {
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		url = `https://${url}`;
	}

	try {
		new URL(url);
		return true;
	} catch (error) {
		return false;
	}
}

/**
 * Normalize URL (add protocol if missing)
 */
export function normalizeUrl(url: string): string {
	url = url.trim();
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		return `https://${url}`;
	}
	return url;
}
