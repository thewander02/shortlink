import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { resolveUrl } from '$lib/actions/links';

export const load: PageServerLoad = async (event) => {
	const shortCode = event.params.shortCode;

	if (!shortCode) {
		throw redirect(302, '/');
	}

	const purpose = event.request.headers.get('purpose');
	const secFetchDest = event.request.headers.get('sec-fetch-dest');
	const secFetchMode = event.request.headers.get('sec-fetch-mode');

	const isDirectNavigation =
		!purpose?.includes('prefetch') &&
		!secFetchDest?.includes('image') &&
		!secFetchMode?.includes('no-cors');

	try {
		const originalUrl = await resolveUrl(shortCode, event, isDirectNavigation);

		if (originalUrl) {
			if (originalUrl.includes('/warning')) {
				throw redirect(302, originalUrl);
			}

			throw redirect(302, originalUrl);
		}

		throw redirect(302, '/');
	} catch (error) {
		// If it's a redirect, re-throw it
		if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
			throw error;
		}

		console.error('Error resolving URL:', error);
		throw redirect(302, '/');
	}
};
