import { URL } from 'node:url';
import * as punycode from 'punycode';
import { parse as tldParse } from 'tldts';

const { toASCII, toUnicode } = punycode;

type Weight = {
	name: string;
	score: number;
	warning: string;
	category?: string;
};

const HIGH_RISK_TLDS = new Set([
	'xyz',
	'top',
	'club',
	'gq',
	'tk',
	'ml',
	'ga',
	'cf',
	'pw',
	'cc',
	'loan'
]);

const SUSPICIOUS_SHORTENERS = new Set([
	'bit.ly',
	'tinyurl.com',
	'goo.gl',
	't.co',
	'is.gd',
	'rebrand.ly',
	'ow.ly'
]);

const SUSPICIOUS_FILE_HOSTS = new Set([
	'drive.google.com',
	'dropbox.com',
	'wetransfer.com',
	'mediafire.com',
	'mega.nz',
	'anonfiles.com'
]);

const BLOCKED_PATTERNS = [
	/\bphish\w*/i,
	/\bmalware\b/i,
	/\bhack(ing|ed|er)?\b/i,
	/\bcred\w*steal\w*/i,
	/\bbank\w*login\b/i,
	/\.(exe|dll|bat|sh|msi|apk)(?:[?#]|$)/i,
	/\bpassword\w*(reset|change|update)\b/i,
	/\bverify\w*(account|identity|payment)\b/i,
	/\bsecure\w*(login|sign[-\s]?in)\b/i,
	/\bconfirm\w*(payment|transaction)\b/i,
	/\bupdate\w*(billing|payment)\b/i,
	/\bwallet\w*(connect|verify|validate)\b/i,
	/\bcrypto\w*(offer|bonus|gift)\b/i,
	/\b(btc|eth|usdt|bnb)\b\w*(gift|giveaway)\b/i
];

const BRANDS = [
	'google',
	'apple',
	'microsoft',
	'amazon',
	'facebook',
	'instagram',
	'twitter',
	'netflix',
	'paypal',
	'chase',
	'wellsfargo',
	'citi',
	'amex',
	'visa',
	'mastercard',
	'coinbase',
	'binance'
];

const SUSPICIOUS_PARAMS = new Set([
	'redirect',
	'return',
	'returnurl',
	'returnto',
	'url',
	'next',
	'target',
	'token',
	'auth',
	'access',
	'account',
	'session',
	'verify'
]);

function add(weights: Weight[], w: Weight, cap = 100) {
	weights.push(w);
}

function isLikelyBase64(str: string) {
	if (str.length < 16) return false;
	if (!/^[A-Za-z0-9+/=_-]+$/.test(str)) return false;
	// Heuristic: high base64 charset ratio
	const alpha = str.replace(/[^A-Za-z0-9+/=_-]/g, '').length / str.length;
	return alpha > 0.9;
}

function containsFullUrl(s: string) {
	try {
		const u = new URL(s);
		return u.protocol === 'http:' || u.protocol === 'https:';
	} catch {
		return false;
	}
}

export interface SafetyCheckResult {
	safe: boolean;
	reason?: string;
	score: number;
	warnings: string[];
	category?: string;
	features?: Weight[];
}

export async function checkUrlSafety(raw: string): Promise<SafetyCheckResult> {
	try {
		let input = raw.trim();
		if (!/^https?:\/\//i.test(input)) input = `https://${input}`;

		const u = new URL(input);
		const asciiHost = toASCII(u.hostname);
		const tld = tldParse(asciiHost, { allowPrivateDomains: true });

		const registrable = tld.domain || asciiHost;
		const publicSuffix = tld.publicSuffix || '';
		const subdomain = tld.subdomain || '';
		const fullHost = [subdomain, registrable].filter(Boolean).join('.');

		const decodedPath = decodeURIComponentSafe(u.pathname.toLowerCase());
		const decodedQuery = decodeURIComponentSafe(u.search.toLowerCase());
		const params = new URLSearchParams(u.search);

		const weights: Weight[] = [];

		if (publicSuffix && HIGH_RISK_TLDS.has(publicSuffix)) {
			add(weights, {
				name: 'high_risk_tld',
				score: 12,
				warning: `High-risk TLD: .${publicSuffix}`
			});
		}

		if (SUSPICIOUS_SHORTENERS.has(registrable)) {
			add(weights, {
				name: 'shortener_domain',
				score: 14,
				warning: 'Known URL shortener (nested shortening)'
			});
		}
		if (SUSPICIOUS_FILE_HOSTS.has(registrable)) {
			add(weights, {
				name: 'file_host',
				score: 10,
				warning: 'File sharing host (be cautious with downloads)'
			});
		}

		for (const rx of BLOCKED_PATTERNS) {
			if (rx.test(decodedPath) || rx.test(decodedQuery)) {
				add(weights, {
					name: `pattern:${rx.source}`,
					score: 28,
					warning: `Matches suspicious pattern: ${rx.source}`,
					category: 'Potential phishing or malware'
				});
			}
		}

		if (subdomain) {
			const count = subdomain.split('.').filter(Boolean).length;
			if (count > 3) {
				add(weights, {
					name: 'excessive_subdomains',
					score: 5 * (count - 3),
					warning: `Unusual number of subdomains (${count})`
				});
			}
		}

		const registrableLabel = registrable.split('.')[0]; // 'google' from google.com
		for (const brand of BRANDS) {
			const brandInHost = fullHost.includes(brand) && registrableLabel !== brand;
			const brandInSubdomain = subdomain && new RegExp(`\\b${brand}\\b`, 'i').test(subdomain);
			if (brandInHost && brandInSubdomain) {
				add(weights, {
					name: `brand_impersonation:${brand}`,
					score: 24,
					warning: `Possible brand impersonation: ${brand}`,
					category: 'Potential brand impersonation'
				});
				break;
			}
		}

		let suspiciousParamCount = 0;
		for (const [k, v] of params.entries()) {
			const key = k.toLowerCase();
			if (SUSPICIOUS_PARAMS.has(key) || [...SUSPICIOUS_PARAMS].some((p) => key.includes(p))) {
				suspiciousParamCount++;
			}
			if (containsFullUrl(v)) suspiciousParamCount++;
			if (isLikelyBase64(v)) {
				add(weights, {
					name: 'base64_param',
					score: 4,
					warning: `Parameter ${k} looks like encoded data`
				});
			}
		}
		if (suspiciousParamCount > 0) {
			add(weights, {
				name: 'suspicious_params',
				score: Math.min(5 * suspiciousParamCount, 20),
				warning: `Contains ${suspiciousParamCount} suspicious query indicators`
			});
		}

		const totalLen = input.length;
		if (totalLen > 200) {
			const extra = Math.min(Math.floor((totalLen - 200) / 50) * 2 + 10, 20);
			add(weights, {
				name: 'long_url',
				score: extra,
				warning: 'URL is unusually long'
			});
		}
		const nonAlphaRatio =
			(u.pathname + u.search).replace(/[A-Za-z0-9/_-]/g, '').length /
			Math.max(1, (u.pathname + u.search).length);
		if (nonAlphaRatio > 0.2 && totalLen > 80) {
			add(weights, {
				name: 'high_symbol_ratio',
				score: 6,
				warning: 'Path/query contains many symbols'
			});
		}

		const isIPv6 = /^\[?[A-Fa-f0-9:]+\]?$/.test(u.host.split(':')[0]);
		const isIPv4 =
			/^(\d{1,3}\.){3}\d{1,3}$/.test(u.hostname) &&
			u.hostname.split('.').every((oct) => Number(oct) >= 0 && Number(oct) <= 255);
		if (isIPv4 || isIPv6) {
			add(weights, {
				name: 'ip_host',
				score: 18,
				warning: 'Uses IP address instead of domain'
			});
		}

		if (u.port) {
			const port = Number(u.port);
			const common = new Set([80, 443, 8080, 8443]);
			if (!common.has(port)) {
				const extra = [21, 22, 23, 25, 445, 3389].includes(port) ? 16 : 10;
				add(weights, {
					name: 'unusual_port',
					score: extra,
					warning: `Unusual port ${port}`
				});
			}
		}

		if (/(\b|%3A)(javascript|data)(:|%3A)/i.test(decodedPath + decodedQuery)) {
			add(weights, {
				name: 'dangerous_scheme',
				score: 40,
				warning: 'Contains javascript: or data: scheme',
				category: 'Potential XSS attack'
			});
		}

		if (asciiHost.includes('xn--')) {
			const unicode = toUnicode(asciiHost);
			add(weights, {
				name: 'idn_punycode',
				score: 18,
				warning: `Internationalized domain (IDN): ${unicode}`,
				category: 'Potential homograph risk'
			});
		}

		let score = Math.min(
			100,
			weights.reduce((s, w) => s + w.score, 0)
		);

		let category: string | undefined = weights.find((w) => w.category)?.category || undefined;

		let safe: boolean;
		let reason: string | undefined;
		if (score >= 70) {
			safe = false;
			reason = 'URL appears potentially malicious';
			if (!category) category = 'High-risk URL';
		} else if (score >= 40) {
			safe = true;
			reason = 'URL looks suspicious but not definitive';
			if (!category) category = 'Suspicious URL';
		} else {
			safe = true;
			category = score > 0 ? 'Low-risk URL' : 'Safe URL';
		}

		return {
			safe,
			reason,
			score,
			warnings: weights.map((w) => w.warning),
			category,
			features: weights
		};
	} catch (e) {
		return {
			safe: false,
			reason: 'Invalid URL or error during safety check',
			score: 100,
			warnings: ['Could not analyze the URL'],
			category: 'Error'
		};
	}
}

function decodeURIComponentSafe(s: string) {
	try {
		return decodeURIComponent(s);
	} catch {
		return s;
	}
}
