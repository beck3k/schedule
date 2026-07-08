import type { CalendarCredentials, DateTime } from '@scheduler/shared';

const GOOGLE_CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

export interface GoogleOAuthConfig {
	clientId: string;
	clientSecret: string;
}

export interface GoogleTokenResponse {
	access_token: string;
	expires_in: number;
	refresh_token?: string;
	token_type: string;
}

export interface GoogleCalendarClientOptions {
	getCredentials: () => Promise<CalendarCredentials>;
	setCredentials: (credentials: CalendarCredentials) => Promise<void>;
	oauth: GoogleOAuthConfig;
	fetch?: typeof fetch;
}

interface ListEventsParams {
	timeMin?: string;
	timeMax?: string;
	maxResults?: number;
	singleEvents?: boolean;
	orderBy?: 'startTime' | 'updated';
}

interface CreateEventBody {
	summary: string;
	description?: string;
	location?: string;
	start: DateTime;
	end: DateTime;
}

interface FreeBusyBody {
	timeMin: string;
	timeMax: string;
	items: Array<{ id: string }>;
}

export interface GoogleCalendarListItem {
	id?: string;
	summary?: string;
	description?: string;
	primary?: boolean;
	timeZone?: string;
}

export interface GoogleEventItem {
	id?: string;
	summary?: string;
	description?: string;
	location?: string;
	start?: DateTime;
	end?: DateTime;
	status?: string;
	htmlLink?: string;
}

export interface GoogleBusyCalendar {
	busy?: Array<{ start?: string; end?: string }>;
}

export class GoogleCalendarClient {
	private readonly getCredentials: () => Promise<CalendarCredentials>;
	private readonly setCredentials: (credentials: CalendarCredentials) => Promise<void>;
	private readonly oauth: GoogleOAuthConfig;
	private readonly fetchFn: typeof fetch;

	constructor(options: GoogleCalendarClientOptions) {
		this.getCredentials = options.getCredentials;
		this.setCredentials = options.setCredentials;
		this.oauth = options.oauth;
		this.fetchFn = options.fetch ?? fetch;
	}

	async listCalendars(): Promise<{ items?: GoogleCalendarListItem[] }> {
		return this.request('/users/me/calendarList');
	}

	async listEvents(calendarId: string, params: ListEventsParams): Promise<{ items?: GoogleEventItem[] }> {
		const search = new URLSearchParams();
		if (params.timeMin) search.set('timeMin', params.timeMin);
		if (params.timeMax) search.set('timeMax', params.timeMax);
		if (params.maxResults) search.set('maxResults', String(params.maxResults));
		if (params.singleEvents) search.set('singleEvents', 'true');
		if (params.orderBy) search.set('orderBy', params.orderBy);

		const query = search.toString();
		const path = `/calendars/${encodeURIComponent(calendarId)}/events${query ? `?${query}` : ''}`;
		return this.request(path);
	}

	async createEvent(calendarId: string, body: CreateEventBody): Promise<GoogleEventItem> {
		return this.request(`/calendars/${encodeURIComponent(calendarId)}/events`, {
			method: 'POST',
			body: JSON.stringify(body),
		});
	}

	async queryFreeBusy(body: FreeBusyBody): Promise<{ calendars?: Record<string, GoogleBusyCalendar> }> {
		return this.request('/freeBusy', {
			method: 'POST',
			body: JSON.stringify(body),
		});
	}

	private async request<T>(path: string, init?: RequestInit): Promise<T> {
		const accessToken = await this.getAccessToken();
		const response = await this.fetchFn(`${GOOGLE_CALENDAR_BASE}${path}`, {
			...init,
			headers: {
				Authorization: `Bearer ${accessToken}`,
				'Content-Type': 'application/json',
				...init?.headers,
			},
		});

		if (!response.ok) {
			const body = await response.text();
			throw new Error(`Google Calendar API error (${response.status}): ${body || response.statusText}`);
		}

		if (response.status === 204) {
			return {} as T;
		}

		return (await response.json()) as T;
	}

	private async getAccessToken(): Promise<string> {
		const credentials = await this.getCredentials();

		if (credentials.accessToken && credentials.expiresAt && credentials.expiresAt > Date.now() + 60_000) {
			return credentials.accessToken;
		}

		if (!credentials.refreshToken) {
			throw new Error('No valid access token. Run `bun run calendar auth` to authenticate.');
		}

		const refreshed = await this.refreshAccessToken(credentials.refreshToken);
		await this.setCredentials(refreshed);
		return refreshed.accessToken;
	}

	private async refreshAccessToken(refreshToken: string): Promise<CalendarCredentials> {
		const body = new URLSearchParams({
			client_id: this.oauth.clientId,
			client_secret: this.oauth.clientSecret,
			refresh_token: refreshToken,
			grant_type: 'refresh_token',
		});

		const response = await this.fetchFn(GOOGLE_TOKEN_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body,
		});

		if (!response.ok) {
			const text = await response.text();
			throw new Error(`Failed to refresh Google token (${response.status}): ${text}`);
		}

		const data = (await response.json()) as GoogleTokenResponse;
		return {
			accessToken: data.access_token,
			refreshToken,
			expiresAt: Date.now() + data.expires_in * 1000,
		};
	}
}

export async function exchangeAuthorizationCode(oauth: GoogleOAuthConfig, code: string, redirectUri: string): Promise<CalendarCredentials> {
	const body = new URLSearchParams({
		client_id: oauth.clientId,
		client_secret: oauth.clientSecret,
		code,
		grant_type: 'authorization_code',
		redirect_uri: redirectUri,
	});

	const response = await fetch(GOOGLE_TOKEN_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});

	if (!response.ok) {
		const text = await response.text();
		throw new Error(`Failed to exchange authorization code (${response.status}): ${text}`);
	}

	const data = (await response.json()) as GoogleTokenResponse;
	return {
		accessToken: data.access_token,
		refreshToken: data.refresh_token,
		expiresAt: Date.now() + data.expires_in * 1000,
	};
}

export const GOOGLE_CALENDAR_SCOPES = [
	'https://www.googleapis.com/auth/calendar.readonly',
	'https://www.googleapis.com/auth/calendar.events',
] as const;

export function buildGoogleAuthUrl(clientId: string, redirectUri: string): string {
	const params = new URLSearchParams({
		client_id: clientId,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: GOOGLE_CALENDAR_SCOPES.join(' '),
		access_type: 'offline',
		prompt: 'consent',
	});

	return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
