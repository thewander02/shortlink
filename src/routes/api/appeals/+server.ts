import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitAppeal } from '$lib/actions/appeals';
import { checkRateLimit } from '$lib/cache';
import { getClientIp } from '$lib/utils/ip';
import {
	RATE_LIMIT_APPEALS,
	RATE_LIMIT_APPEALS_WINDOW,
	MAX_SHORT_CODE_LENGTH,
	MIN_REASON_LENGTH,
	MAX_REASON_LENGTH,
	MAX_CONTACT_INFO_LENGTH
} from '$lib/constants';

export const POST: RequestHandler = async (event) => {
	try {
		const ip = getClientIp(event);
		const rateLimit = await checkRateLimit(
			ip,
			'appeals',
			RATE_LIMIT_APPEALS,
			RATE_LIMIT_APPEALS_WINDOW
		);

		if (!rateLimit.allowed) {
			return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
		}

		const { shortCode, reason, contactInfo } = await event.request.json();

		if (!shortCode || typeof shortCode !== 'string' || shortCode.length > MAX_SHORT_CODE_LENGTH) {
			return json({ error: 'Invalid short code' }, { status: 400 });
		}

		if (
			!reason ||
			typeof reason !== 'string' ||
			reason.trim().length < MIN_REASON_LENGTH ||
			reason.length > MAX_REASON_LENGTH
		) {
			return json(
				{
					error: `Reason must be between ${MIN_REASON_LENGTH} and ${MAX_REASON_LENGTH} characters`
				},
				{ status: 400 }
			);
		}

		if (
			contactInfo &&
			(typeof contactInfo !== 'string' || contactInfo.length > MAX_CONTACT_INFO_LENGTH)
		) {
			return json({ error: 'Contact info too long' }, { status: 400 });
		}

		const success = await submitAppeal(shortCode, reason, event, contactInfo);

		if (!success) {
			return json({ error: 'Failed to submit appeal' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error submitting appeal:', error);
		return json({ error: 'Failed to submit appeal' }, { status: 500 });
	}
};
