import type { PageServerLoad } from './$types';
import { getUserHistory } from '$lib/actions/links';

export const load: PageServerLoad = async (event) => {
	try {
		const urlHistory = await getUserHistory(event);
		return { urlHistory };
	} catch (error) {
		console.error('Error fetching URL history:', error);
		const errorMessage = error instanceof Error ? error.message : 'Unknown error';
		return {
			urlHistory: [],
			error: `Failed to load your URL history: ${errorMessage}. Please try again later.`
		};
	}
};
