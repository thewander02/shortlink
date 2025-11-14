import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { blockIp, validateAdminAccess } from '$lib/actions/admin';
import { checkRateLimit } from '$lib/cache';
import { getClientIp } from '$lib/utils/ip';

export const POST: RequestHandler = async (event) => {
	const adminKey = event.url.searchParams.get('key') || '';

	if (!(await validateAdminAccess(adminKey))) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const ip = getClientIp(event);
	const rateLimit = await checkRateLimit(ip, 'admin_actions', 100, 60);

	if (!rateLimit.allowed) {
		return json({ error: 'Rate limit exceeded' }, { status: 429 });
	}

	const { ip: targetIp, reason, durationHours } = await event.request.json();

	if (!targetIp || !reason) {
		return json({ error: 'IP and reason are required' }, { status: 400 });
	}

	const success = await blockIp(adminKey, targetIp, reason, durationHours || 24);

	if (!success) {
		return json({ error: 'Failed to block IP' }, { status: 500 });
	}

	return json({ success: true });
};
