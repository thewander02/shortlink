import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { validateAdminAccess } from '$lib/actions/admin';

export const load: LayoutServerLoad = async (event) => {
	const adminKey = event.url.searchParams.get('key') || event.cookies.get('admin_key') || '';

	if (!adminKey || !(await validateAdminAccess(adminKey))) {
		throw redirect(302, '/');
	}

	event.cookies.set('admin_key', adminKey, {
		path: '/',
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7
	});

	return { adminKey };
};
