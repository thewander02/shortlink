import type { PageServerLoad } from './$types';
import { getUrlAnalytics } from '$lib/actions/links';

export const load: PageServerLoad = async (event) => {
	const shortCode = event.params.shortCode;

	if (!shortCode) {
		return { analytics: null, shortCode: '', error: 'Short code is required' };
	}

	try {
		const analytics = await getUrlAnalytics(shortCode);
		return { analytics, shortCode };
	} catch (error) {
		console.error('Error fetching analytics:', error);
		return { analytics: null, shortCode, error: 'Failed to load analytics' };
	}
};
