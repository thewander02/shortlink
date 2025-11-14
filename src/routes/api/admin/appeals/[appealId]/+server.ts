import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { resolveAppeal, validateAdminAccess } from '$lib/actions/admin';
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

	const appealId = event.params.appealId;
	const appealType = event.url.searchParams.get('type') as 'url' | 'ip';
	const action = event.url.searchParams.get('action') as 'approve' | 'reject';

	if (!appealId || !appealType || !action) {
		return json({ error: 'Invalid parameters' }, { status: 400 });
	}

	const success = await resolveAppeal(adminKey, appealId, appealType, action);

	if (!success) {
		return json({ error: 'Failed to resolve appeal' }, { status: 500 });
	}

	return json({ success: true });
};
