import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteShortUrl } from '$lib/actions/links';

export const DELETE: RequestHandler = async (event) => {
	try {
		const shortCode = event.params.shortCode;

		if (!shortCode) {
			return json({ error: 'Short code is required' }, { status: 400 });
		}

		const success = await deleteShortUrl(shortCode, event);

		if (!success) {
			return json({ error: 'Failed to delete URL or URL not found' }, { status: 404 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting URL:', error);
		return json({ error: 'Failed to delete URL' }, { status: 500 });
	}
};
