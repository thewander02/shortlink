import type { PageServerLoad } from './$types';
import { getBlockedIPs } from '$lib/actions/admin';

export const load: PageServerLoad = async (event) => {
	const adminKey = event.url.searchParams.get('key') || event.cookies.get('admin_key') || '';

	if (!adminKey) {
		return { blockedIPs: [] };
	}

	const blockedIPs = await getBlockedIPs(adminKey);

	return { blockedIPs };
};
