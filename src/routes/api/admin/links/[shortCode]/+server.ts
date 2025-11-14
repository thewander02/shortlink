import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteLinkAdmin, validateAdminAccess } from '$lib/actions/admin';

export const DELETE: RequestHandler = async (event) => {
	const adminKey = event.url.searchParams.get('key') || '';

	if (!(await validateAdminAccess(adminKey))) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const shortCode = event.params.shortCode;

	if (!shortCode) {
		return json({ error: 'Short code is required' }, { status: 400 });
	}

	const success = await deleteLinkAdmin(adminKey, shortCode);

	if (!success) {
		return json({ error: 'Failed to delete link' }, { status: 500 });
	}

	return json({ success: true });
};
