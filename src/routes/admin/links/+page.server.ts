import type { PageServerLoad } from './$types';
import { getAllLinks } from '$lib/actions/admin';

export const load: PageServerLoad = async (event) => {
	const adminKey = event.url.searchParams.get('key') || event.cookies.get('admin_key') || '';
	const page = parseInt(event.url.searchParams.get('page') || '1');
	const search = event.url.searchParams.get('search') || undefined;

	if (!adminKey) {
		return { links: [], total: 0, page: 1 };
	}

	const result = await getAllLinks(adminKey, page, 50, search);

	return {
		links: result.links,
		total: result.total,
		page,
		search: search || ''
	};
};
