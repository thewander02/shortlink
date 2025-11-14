/**
 * Application-wide constants
 */

// URL and validation limits
export const MAX_URL_LENGTH = 2048;
export const MAX_SHORT_CODE_LENGTH = 50;
export const MAX_REASON_LENGTH = 1000;
export const MAX_REPORT_REASON_LENGTH = 500;
export const MIN_REASON_LENGTH = 10;
export const MAX_SEARCH_QUERY_LENGTH = 200;
export const MAX_CONTACT_INFO_LENGTH = 255;
export const MAX_CATEGORY_LENGTH = 50;
export const MAX_DESCRIPTION_LENGTH = 1000;

// Pagination limits
export const DEFAULT_PAGE = 1;
export const DEFAULT_LIMIT = 50;
export const MAX_PAGE = 1000;
export const MAX_LIMIT = 100;
export const MIN_PAGE = 1;
export const MIN_LIMIT = 1;

// Rate limiting
export const RATE_LIMIT_SHORTENING = 100;
export const RATE_LIMIT_GENERAL = 500;
export const RATE_LIMIT_WINDOW_SECONDS = 60;
export const RATE_LIMIT_APPEALS = 5;
export const RATE_LIMIT_APPEALS_WINDOW = 3600;
export const RATE_LIMIT_REPORTING = 10;
export const RATE_LIMIT_REPORTING_WINDOW = 3600;

// IP blocking
export const DEFAULT_IP_BLOCK_DURATION_HOURS = 24;
export const MIN_IP_BLOCK_DURATION_HOURS = 1;
export const MAX_IP_BLOCK_DURATION_HOURS = 720;
export const MIN_IP_BLOCK_REASON_LENGTH = 3;

// Cache TTL (in seconds)
export const CACHE_TTL_LINK = 60 * 60;
export const CACHE_TTL_ANALYTICS = 300;

// Time windows (in milliseconds)
export const ONE_HOUR_MS = 60 * 60 * 1000;
export const ONE_DAY_MS = 24 * 60 * 60 * 1000;
export const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

// Auto-flag thresholds
export const AUTO_FLAG_REPORT_COUNT = 3;
export const AUTO_FLAG_MIN_UNIQUE_IPS = 2;

// Admin key validation
export const MIN_ADMIN_KEY_LENGTH = 32;

// Short code generation
export const SHORT_CODE_LENGTH = 6;
