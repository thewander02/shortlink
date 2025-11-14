import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { unblockIp, validateAdminAccess } from '$lib/actions/admin';
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

	const targetIp = event.url.searchParams.get('ip');

	if (!targetIp) {
		return json({ error: 'IP is required' }, { status: 400 });
	}

	const success = await unblockIp(adminKey, targetIp);

	if (!success) {
		return json({ error: 'Failed to unblock IP' }, { status: 500 });
	}

	return json({ success: true });
};
