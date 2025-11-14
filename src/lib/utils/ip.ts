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
 * Check if a hostname is a valid IPv4 address
 */
function isValidIPv4(hostname: string): boolean {
	const parts = hostname.split('.');
	if (parts.length !== 4) {
		return false;
	}

	for (const part of parts) {
		const num = parseInt(part, 10);
		if (isNaN(num) || num < 0 || num > 255 || part !== num.toString()) {
			return false;
		}
	}

	return true;
}

/**
 * Check if a hostname is a valid IPv6 address (with or without brackets)
 */
function isValidIPv6(hostname: string): boolean {
	const cleanHostname =
		hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;

	const ipv6Regex =
		/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$|^([0-9a-fA-F]{1,4}:)*::([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:)*::[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4}:)+::$/;

	return ipv6Regex.test(cleanHostname);
}

/**
 * Validate URL format - requires a valid TLD or IP address
 */
export function isValidUrl(url: string): boolean {
	if (!url.startsWith('http://') && !url.startsWith('https://')) {
		url = `https://${url}`;
	}

	try {
		const parsedUrl = new URL(url);
		const hostname = parsedUrl.hostname;

		if (!hostname || hostname.length === 0) {
			return false;
		}

		if (hostname === 'localhost') {
			return true;
		}

		if (isValidIPv4(hostname)) {
			return true;
		}

		if (isValidIPv6(hostname)) {
			return true;
		}

		if (!hostname.includes('.')) {
			return false;
		}

		const parts = hostname.split('.');
		const tld = parts[parts.length - 1];

		if (tld.length < 2 || !/^[a-zA-Z0-9-]+$/.test(tld)) {
			return false;
		}

		for (const part of parts) {
			if (part.length === 0 || !/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(part)) {
				return false;
			}
		}

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
