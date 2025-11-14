import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { reportMaliciousUrl } from '$lib/actions/links';
import { checkRateLimit } from '$lib/cache';
import { getClientIp } from '$lib/utils/ip';
import {
	RATE_LIMIT_REPORTING,
	RATE_LIMIT_REPORTING_WINDOW,
	MAX_SHORT_CODE_LENGTH,
	MIN_REASON_LENGTH,
	MAX_REPORT_REASON_LENGTH,
	MAX_CONTACT_INFO_LENGTH,
	MAX_CATEGORY_LENGTH,
	MAX_DESCRIPTION_LENGTH
} from '$lib/constants';

export const POST: RequestHandler = async (event) => {
	try {
		const ip = getClientIp(event);
		const rateLimit = await checkRateLimit(
			ip,
			'reporting',
			RATE_LIMIT_REPORTING,
			RATE_LIMIT_REPORTING_WINDOW
		);

		if (!rateLimit.allowed) {
			return json({ error: 'Rate limit exceeded. Please try again later.' }, { status: 429 });
		}

		const { shortCode, reason, email, category, description } = await event.request.json();

		if (!shortCode || typeof shortCode !== 'string' || shortCode.length > MAX_SHORT_CODE_LENGTH) {
			return json({ error: 'Invalid short code' }, { status: 400 });
		}

		if (
			!reason ||
			typeof reason !== 'string' ||
			reason.trim().length < MIN_REASON_LENGTH ||
			reason.length > MAX_REPORT_REASON_LENGTH
		) {
			return json(
				{
					error: `Reason must be between ${MIN_REASON_LENGTH} and ${MAX_REPORT_REASON_LENGTH} characters`
				},
				{ status: 400 }
			);
		}

		if (email && (typeof email !== 'string' || email.length > MAX_CONTACT_INFO_LENGTH)) {
			return json({ error: 'Invalid email format' }, { status: 400 });
		}

		if (category && (typeof category !== 'string' || category.length > MAX_CATEGORY_LENGTH)) {
			return json({ error: 'Invalid category' }, { status: 400 });
		}

		if (
			description &&
			(typeof description !== 'string' || description.length > MAX_DESCRIPTION_LENGTH)
		) {
			return json({ error: 'Description too long' }, { status: 400 });
		}

		const success = await reportMaliciousUrl(
			shortCode,
			reason,
			event,
			email || category || description
				? {
						email,
						category,
						description
					}
				: undefined
		);

		if (!success) {
			return json({ error: 'Failed to submit report' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error submitting report:', error);
		return json({ error: 'Failed to submit report' }, { status: 500 });
	}
};
