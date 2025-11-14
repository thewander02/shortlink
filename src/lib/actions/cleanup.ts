import { prisma } from '../prisma';

/**
 * Clean up user IDs that have 0 links
 * This should be run periodically (e.g., every 7 days)
 */
export async function cleanupInactiveUsers(): Promise<{
	deleted: number;
	errors: number;
}> {
	let deleted = 0;
	let errors = 0;

	try {
		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		// Find all unique userIds and check which ones have 0 links
		// Since userId is stored on Link records, users with 0 links don't exist in DB
		// So we'll clean up old inactive links, which effectively removes users with only inactive links

		// First, find links older than 7 days with 0 clicks
		const oldInactiveLinks = await prisma.link.findMany({
			where: {
				createdAt: { lt: sevenDaysAgo },
				OR: [
					{
						analytics: {
							clicks: 0
						}
					},
					{
						analytics: null
					}
				]
			},
			select: {
				shortCode: true,
				userId: true
			}
		});

		const linksByUserId = new Map<string, number>();
		for (const link of oldInactiveLinks) {
			if (link.userId) {
				linksByUserId.set(link.userId, (linksByUserId.get(link.userId) || 0) + 1);
			}
		}

		// Check which users will have 0 links after deleting these old links
		const usersToCleanup: string[] = [];
		for (const [userId, count] of linksByUserId.entries()) {
			const totalLinks = await prisma.link.count({
				where: { userId }
			});

			// If deleting these links will leave user with 0 links, mark for cleanup
			if (totalLinks === count) {
				usersToCleanup.push(userId);
			}
		}

		const batchSize = 100;
		for (let i = 0; i < oldInactiveLinks.length; i += batchSize) {
			const batch = oldInactiveLinks.slice(i, i + batchSize);

			for (const link of batch) {
				try {
					await prisma.link.delete({
						where: { shortCode: link.shortCode }
					});
					deleted++;
				} catch (error) {
					console.error(`Error deleting link ${link.shortCode}:`, error);
					errors++;
				}
			}
		}

		if (usersToCleanup.length > 0) {
			console.log(`Cleaned up ${usersToCleanup.length} users (now have 0 links)`);
		}

		return { deleted, errors };
	} catch (error) {
		console.error('Error in cleanupInactiveUsers:', error);
		throw error;
	}
}

/**
 * Get statistics about inactive users
 */
export async function getInactiveUserStats(): Promise<{
	totalUsers: number;
	usersWithZeroLinks: number;
	oldInactiveLinks: number;
}> {
	try {
		const totalUsers = await prisma.link.groupBy({
			by: ['userId'],
			where: {
				userId: { not: null }
			},
			_count: {
				shortCode: true
			}
		});

		const usersWithZeroLinks = totalUsers.filter((u) => u._count.shortCode === 0).length;

		const sevenDaysAgo = new Date();
		sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

		const oldInactiveLinks = await prisma.link.count({
			where: {
				createdAt: { lt: sevenDaysAgo },
				analytics: {
					clicks: 0
				}
			}
		});

		return {
			totalUsers: totalUsers.length,
			usersWithZeroLinks,
			oldInactiveLinks
		};
	} catch (error) {
		console.error('Error getting inactive user stats:', error);
		throw error;
	}
}
