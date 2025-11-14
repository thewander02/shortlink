import type { PageServerLoad } from './$types';
import { getReportedUrls } from '$lib/actions/admin';

export const load: PageServerLoad = async (event) => {
	const adminKey = event.url.searchParams.get('key') || event.cookies.get('admin_key') || '';

	if (!adminKey) {
		return { reports: [] };
	}

	const reports = await getReportedUrls(adminKey);

	return { reports };
};
