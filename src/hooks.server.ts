import type { Handle } from '@sveltejs/kit';
import { isIpBlocked, checkRateLimit, isPanicModeEnabled } from '$lib/cache';
import { getClientIp } from '$lib/utils/ip';
import {
	RATE_LIMIT_SHORTENING,
	RATE_LIMIT_GENERAL,
	RATE_LIMIT_WINDOW_SECONDS
} from '$lib/constants';

export const handle: Handle = async ({ event, resolve }) => {
	const path = event.url.pathname;
	const ip = getClientIp(event);

	if (
		path.startsWith('/_app') ||
		path.startsWith('/api/admin') ||
		path.startsWith('/admin') ||
		path.includes('.')
	) {
		return resolve(event);
	}

	if (await isIpBlocked(ip)) {
		if (path === '/blocked' || path.startsWith('/api/appeals/ip')) {
			return resolve(event);
		}

		return new Response(null, {
			status: 302,
			headers: { Location: '/blocked' }
		});
	}

	if (path === '/api/shorten') {
		// Use cached panic mode check to avoid DB queries
		if (await isPanicModeEnabled()) {
			return new Response(JSON.stringify({ error: 'URL shortening is temporarily disabled' }), {
				status: 503,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	if (path.startsWith('/api')) {
		const isShortening = path === '/api/shorten';
		const rateLimit = await checkRateLimit(
			ip,
			isShortening ? 'shortening' : 'general',
			isShortening ? RATE_LIMIT_SHORTENING : RATE_LIMIT_GENERAL,
			RATE_LIMIT_WINDOW_SECONDS
		);

		if (!rateLimit.allowed) {
			return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
				status: 429,
				headers: { 'Content-Type': 'application/json' }
			});
		}
	}

	return resolve(event);
};
