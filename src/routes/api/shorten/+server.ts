import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { shortenUrl } from '$lib/actions/links';
import { checkRateLimit } from '$lib/cache';
import { getClientIp } from '$lib/utils/ip';
import { RATE_LIMIT_SHORTENING, RATE_LIMIT_WINDOW_SECONDS } from '$lib/constants';

export const POST: RequestHandler = async (event) => {
	try {
		const { url } = await event.request.json();

		if (!url || typeof url !== 'string') {
			return json({ error: 'URL is required' }, { status: 400 });
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

		const { prisma } = await import('$lib/prisma');
		const panicMode = await prisma.systemSetting.findUnique({
			where: { key: 'panic_mode' }
		});

		if (panicMode?.value === 'true') {
			return json({ error: 'URL shortening is temporarily disabled' }, { status: 503 });
		}

		const shortUrl = await shortenUrl(url, event);

		return json({ shortUrl });
	} catch (error) {
		console.error('Error shortening URL:', error);
		return json(
			{ error: error instanceof Error ? error.message : 'Failed to shorten URL' },
			{ status: 500 }
		);
	}
};
