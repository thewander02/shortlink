import type { PageServerLoad } from './$types';
import { getPendingAppeals } from '$lib/actions/admin';

export const load: PageServerLoad = async (event) => {
	const adminKey = event.url.searchParams.get('key') || event.cookies.get('admin_key') || '';

	if (!adminKey) {
		return { urlAppeals: [], ipAppeals: [] };
	}

	const appeals = await getPendingAppeals(adminKey);

	return appeals;
};
