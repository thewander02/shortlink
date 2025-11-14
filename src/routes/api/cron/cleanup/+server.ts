import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { cleanupInactiveUsers } from '$lib/actions/cleanup';

/**
 * Cron endpoint for cleaning up inactive users
 * Should be called by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 *
 * To secure this endpoint, you can:
 * 1. Use a secret token in the Authorization header
 * 2. Use a query parameter with a secret
 * 3. Restrict by IP if using a specific cron service
 */
export const GET: RequestHandler = async (event) => {
	try {
		const authToken =
			event.url.searchParams.get('token') || event.request.headers.get('authorization');
		const expectedToken = process.env.CRON_SECRET_TOKEN;

		if (expectedToken && authToken !== expectedToken && authToken !== `Bearer ${expectedToken}`) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const result = await cleanupInactiveUsers();

		return json({
			success: true,
			...result,
			timestamp: new Date().toISOString()
		});
	} catch (error) {
		console.error('Error in cleanup cron job:', error);
		return json(
			{
				error: 'Cleanup failed',
				message: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};

export const POST: RequestHandler = async (event) => {
	return GET(event);
};
