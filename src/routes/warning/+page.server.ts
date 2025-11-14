import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getUrlAnalytics, isUrlMalicious } from '$lib/actions/links';

export const load: PageServerLoad = async (event) => {
	const shortCode = event.url.searchParams.get('code');

	if (!shortCode) {
		throw redirect(302, '/');
	}

	try {
		const analytics = await getUrlAnalytics(shortCode);
		const malicious = await isUrlMalicious(shortCode);

		if (!analytics || !malicious) {
			throw redirect(302, '/');
		}

		return {
			shortCode,
			analytics,
			originalUrl: analytics.originalUrl || ''
		};
	} catch (error) {
		console.error('Error in warning page:', error);
		if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
			throw error;
		}
		throw redirect(302, '/');
	}
};
