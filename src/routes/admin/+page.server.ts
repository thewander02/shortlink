import type { PageServerLoad } from './$types';
import { getSystemStats, getRecentActivity } from '$lib/actions/admin';

export const load: PageServerLoad = async (event) => {
	const adminKey = event.url.searchParams.get('key') || event.cookies.get('admin_key') || '';

	if (!adminKey) {
		return { stats: null, activity: null };
	}

	const [stats, activity] = await Promise.all([
		getSystemStats(adminKey),
		getRecentActivity(adminKey)
	]);

	return { stats, activity };
};
