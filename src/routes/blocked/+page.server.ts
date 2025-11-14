import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { prisma } from '$lib/prisma';
import { getClientIp } from '$lib/utils/ip';

export const load: PageServerLoad = async (event) => {
	const ip = getClientIp(event);

	if (ip === 'unknown') {
		throw redirect(302, '/');
	}

	try {
		const ipBlock = await prisma.ipBlock.findUnique({
			where: { ipAddress: ip }
		});

		if (!ipBlock || ipBlock.status !== 'active') {
			throw redirect(302, '/');
		}

		if (ipBlock.expiresAt && ipBlock.expiresAt < new Date()) {
			throw redirect(302, '/');
		}

		return {
			ip,
			blockInfo: {
				reason: ipBlock.reason,
				blockedAt: ipBlock.blockedAt.toISOString(),
				expiresAt: ipBlock.expiresAt?.toISOString() || null
			}
		};
	} catch (error) {
		if (error && typeof error === 'object' && 'status' in error && error.status === 302) {
			throw error;
		}
		console.error('Error in blocked page:', error);
		throw redirect(302, '/');
	}
};
