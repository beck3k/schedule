/** Provider-agnostic calendar domain types. */

export interface DateTime {
	/** All-day events use YYYY-MM-DD. */
	date?: string;
	/** Timed events use RFC3339 date-time. */
	dateTime?: string;
	timeZone?: string;
}

export interface CalendarSummary {
	id: string;
	name: string;
	description?: string;
	primary?: boolean;
	timeZone?: string;
}

export type EventStatus = 'confirmed' | 'tentative' | 'cancelled';

export interface CalendarEvent {
	id: string;
	calendarId: string;
	title: string;
	description?: string;
	location?: string;
	start: DateTime;
	end: DateTime;
	status?: EventStatus;
	htmlLink?: string;
}

export interface CreateEventInput {
	title: string;
	description?: string;
	location?: string;
	start: DateTime;
	end: DateTime;
}

export interface GetEventsOptions {
	calendarId: string;
	timeMin: string;
	timeMax: string;
	maxResults?: number;
}

export interface FreeBusyRequest {
	calendarIds: string[];
	timeMin: string;
	timeMax: string;
}

export interface BusyPeriod {
	start: string;
	end: string;
}

export interface CalendarFreeBusy {
	calendarId: string;
	busy: BusyPeriod[];
}

export interface CalendarCredentials {
	accessToken: string;
	refreshToken?: string;
	expiresAt?: number;
}
