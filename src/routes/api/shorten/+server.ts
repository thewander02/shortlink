import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { shortenUrl } from '$lib/actions/links';
import { checkRateLimit, isPanicModeEnabled } from '$lib/cache';
import { getClientIp } from '$lib/utils/ip';
import { RATE_LIMIT_SHORTENING, RATE_LIMIT_WINDOW_SECONDS } from '$lib/constants';

export const POST: RequestHandler = async (event) => {
	try {
		const { url } = await event.request.json();

		if (!url || typeof url !== 'string') {
			return json({ error: 'URL is required' }, { status: 400 });
		}

		if (await isPanicModeEnabled()) {
			return json({ error: 'URL shortening is temporarily disabled' }, { status: 503 });
		}

		const ip = getClientIp(event);
		const rateLimit = await checkRateLimit(
			ip,
			'shortening',
			RATE_LIMIT_SHORTENING,
			RATE_LIMIT_WINDOW_SECONDS
		);

		if (!rateLimit.allowed) {
			return json({ error: 'Rate limit exceeded' }, { status: 429 });
		}

		const shortUrl = await shortenUrl(url, event);

		return json({ shortUrl });
	} catch (error) {
		console.error('Error shortening URL:', error);
		
		// Handle connection pool errors specifically
		if (error instanceof Error && error.message.includes('connection pool')) {
			return json(
				{ error: 'Service temporarily unavailable. Please try again in a moment.' },
				{ status: 503 }
			);
		}
		
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to shorten URL' },
			{ status: 500 }
		);
	}
};
