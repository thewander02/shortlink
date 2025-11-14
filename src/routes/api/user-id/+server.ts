import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUserIdFromRequest, setUserIdInStorage, getUserIdFromStorage } from '$lib/utils/user-id';
import { getClientIp } from '$lib/utils/ip';
import { prisma } from '$lib/prisma';

export const GET: RequestHandler = async (event) => {
	try {
		const ipAddress = getClientIp(event);
		const userId = await getUserIdFromRequest(event, ipAddress, prisma);
		return json({ userId });
	} catch (error) {
		console.error('Error getting user ID:', error);
		return json({ error: 'Failed to get user ID' }, { status: 500 });
	}
};

export const POST: RequestHandler = async (event) => {
	try {
		const { userId } = await event.request.json();

		if (!userId || typeof userId !== 'string') {
			return json({ error: 'Invalid user ID' }, { status: 400 });
		}

		const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
		if (!uuidRegex.test(userId)) {
			return json({ error: 'Invalid UUID format' }, { status: 400 });
		}

		event.cookies.set('shortlink_user_id', userId, {
			path: '/',
			httpOnly: false,
			secure: process.env.NODE_ENV === 'production',
			sameSite: 'lax',
			maxAge: 60 * 60 * 24 * 365
		});

		return json({ success: true, userId });
	} catch (error) {
		console.error('Error setting user ID:', error);
		return json({ error: 'Failed to set user ID' }, { status: 500 });
	}
};
