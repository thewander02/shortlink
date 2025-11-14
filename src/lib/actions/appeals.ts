import { nanoid } from 'nanoid';
import { prisma } from '../prisma';
import { isIpBlocked } from '../cache';
import { getClientIp } from '../utils/ip';
import type { RequestEvent } from '@sveltejs/kit';
import {
	MAX_REASON_LENGTH,
	MIN_REASON_LENGTH,
	MAX_CONTACT_INFO_LENGTH,
	MAX_SHORT_CODE_LENGTH
} from '../constants';

/**
 * Submit an appeal for a URL marked as malicious
 * @param shortCode - The short code to appeal
 * @param reason - Reason for the appeal (10-1000 characters)
 * @param event - SvelteKit request event
 * @param contactInfo - Optional contact information (max 255 characters)
 * @returns true if successful, false otherwise
 */
export async function submitAppeal(
	shortCode: string,
	reason: string,
	event: RequestEvent,
	contactInfo?: string
): Promise<boolean> {
	try {
		shortCode = shortCode.trim().replace(/[^a-zA-Z0-9_-]/g, '');
		reason = reason.trim().substring(0, MAX_REASON_LENGTH);

		if (!shortCode || !reason || shortCode.length < 1 || reason.length < MIN_REASON_LENGTH) {
			return false;
		}

		const ipAddress = getClientIp(event);

		const link = await prisma.link.findUnique({
			where: { shortCode },
			select: { isMalicious: true }
		});

		if (!link || !link.isMalicious) {
			return false;
		}

		// Prevent duplicate appeals from same IP
		const existingAppeal = await prisma.appeal.findFirst({
			where: {
				shortCode,
				appellantIp: ipAddress,
				status: 'pending'
			}
		});

		if (existingAppeal) {
			return false;
		}

		await prisma.appeal.create({
			data: {
				shortCode,
				reason,
				appellantIp: ipAddress,
				contactInfo: (contactInfo || '').substring(0, MAX_CONTACT_INFO_LENGTH),
				status: 'pending'
			}
		});

		return true;
	} catch (error) {
		console.error('Error submitting appeal:', error);
		return false;
	}
}

/**
 * Submit an appeal for a blocked IP address
 * @param ip - The blocked IP address to appeal
 * @param reason - Reason for the appeal (10-1000 characters)
 * @param event - SvelteKit request event
 * @param contactInfo - Optional contact information (max 255 characters)
 * @returns true if successful, false otherwise
 */
export async function submitIpBlockAppeal(
	ip: string,
	reason: string,
	event: RequestEvent,
	contactInfo?: string
): Promise<boolean> {
	try {
		if (!ip || typeof ip !== 'string' || ip.length > 45) {
			return false;
		}

		reason = reason.trim().substring(0, MAX_REASON_LENGTH);

		if (!reason || reason.length < MIN_REASON_LENGTH) {
			return false;
		}

		const ipBlock = await prisma.ipBlock.findUnique({
			where: { ipAddress: ip },
			select: { status: true }
		});

		if (!ipBlock || ipBlock.status !== 'active') {
			return false;
		}

		const appellantIp = getClientIp(event);

		// Prevent duplicate appeals from same IP
		const existingAppeal = await prisma.ipAppeal.findFirst({
			where: {
				ipAddress: ip,
				appellantIp,
				status: 'pending'
			}
		});

		if (existingAppeal) {
			return false;
		}

		await prisma.ipAppeal.create({
			data: {
				ipAddress: ip,
				reason,
				appellantIp,
				contactInfo: (contactInfo || '').substring(0, MAX_CONTACT_INFO_LENGTH),
				status: 'pending'
			}
		});

		return true;
	} catch (error) {
		console.error('Error submitting IP block appeal:', error);
		return false;
	}
}
