import { Redis } from '@upstash/redis';

const redisUrl = process.env.KV_REST_API_URL;
const redisToken = process.env.KV_REST_API_TOKEN;

export const redis =
	redisUrl && redisToken
		? new Redis({
				url: redisUrl,
				token: redisToken || undefined
			})
		: (null as unknown as Redis);

export function isRedisAvailable(): boolean {
	return !!(redisUrl && redisToken);
}
