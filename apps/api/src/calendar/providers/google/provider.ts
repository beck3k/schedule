import type {
	CalendarEvent,
	CalendarFreeBusy,
	CalendarProvider,
	CalendarSummary,
	CreateEventInput,
	FreeBusyRequest,
	GetEventsOptions,
} from '@scheduler/shared';
import type { GoogleCalendarClient } from './client';
import { mapGoogleCalendar, mapGoogleEvent, mapGoogleFreeBusy } from './mappers';

export interface GoogleCalendarProviderOptions {
	client: GoogleCalendarClient;
}

export class GoogleCalendarProvider implements CalendarProvider {
	private readonly client: GoogleCalendarClient;

	constructor(options: GoogleCalendarProviderOptions) {
		this.client = options.client;
	}

	async listCalendars(): Promise<CalendarSummary[]> {
		const response = await this.client.listCalendars();
		return (response.items ?? []).map(mapGoogleCalendar);
	}

	async getEvents(options: GetEventsOptions): Promise<CalendarEvent[]> {
		const response = await this.client.listEvents(options.calendarId, {
			timeMin: options.timeMin,
			timeMax: options.timeMax,
			maxResults: options.maxResults,
			singleEvents: true,
			orderBy: 'startTime',
		});

		return (response.items ?? []).map((item) => mapGoogleEvent(item, options.calendarId));
	}

	async createEvent(calendarId: string, event: CreateEventInput): Promise<CalendarEvent> {
		const created = await this.client.createEvent(calendarId, {
			summary: event.title,
			description: event.description,
			location: event.location,
			start: event.start,
			end: event.end,
		});

		return mapGoogleEvent(created, calendarId);
	}

	async getFreeBusy(request: FreeBusyRequest): Promise<CalendarFreeBusy[]> {
		const response = await this.client.queryFreeBusy({
			timeMin: request.timeMin,
			timeMax: request.timeMax,
			items: request.calendarIds.map((id) => ({ id })),
		});

		return mapGoogleFreeBusy(response.calendars ?? {}, request.calendarIds);
	}
}
