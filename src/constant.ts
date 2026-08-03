/**
 * Stamped into the `creator` field of HAR exports so a shared archive
 * says which version produced it. Must be kept in step with the
 * `version` field in package.json — there is no way to read that at
 * runtime without bundling the whole manifest into the app.
 */
export const LIB_VERSION = '1.1.0';

// StartNetworkLoggingOptions
export const LOGGER_MAX_REQUESTS: number = 500;
export const LOGGER_REFRESH_RATE: number = 50;
/** 1 MB — bodies above this are dropped from memory, entry marked truncated. */
export const LOGGER_MAX_RESPONSE_BODY_SIZE: number = 1024 * 1024;

/** A request slower than this is amber in the list and stat cards. */
export const DEFAULT_SLOW_THRESHOLD_MS: number = 1000;

/** Search input debounce, per the handoff. */
export const SEARCH_DEBOUNCE_MS: number = 150;

/** Toast auto-dismiss delay. */
export const TOAST_DURATION_MS: number = 1800;

/** Bottom sheet slide-up duration. */
export const SHEET_ANIMATION_MS: number = 240;
