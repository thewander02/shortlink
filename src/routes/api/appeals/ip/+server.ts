import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { submitIpBlockAppeal } from '$lib/actions/appeals';

export const POST: RequestHandler = async (event) => {
	try {
		const { ip, reason, contactInfo } = await event.request.json();

		if (!ip || !reason) {
			return json({ error: 'IP and reason are required' }, { status: 400 });
		}

		const success = await submitIpBlockAppeal(ip, reason, event, contactInfo);

		if (!success) {
			return json({ error: 'Failed to submit appeal' }, { status: 500 });
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error submitting IP appeal:', error);
		return json({ error: 'Failed to submit appeal' }, { status: 500 });
	}
};
