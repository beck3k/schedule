const DEV_API_URL = 'http://localhost:8787';

/** Base URL for the schedule-api worker. Override with PUBLIC_API_URL. */
export const API_URL =
	import.meta.env.PUBLIC_API_URL ?? (import.meta.env.DEV ? DEV_API_URL : '');
