import type { CalendarEvent, CalendarFreeBusy, CalendarSummary, CreateEventInput, FreeBusyRequest, GetEventsOptions } from './types';

/** Provider-agnostic calendar operations. */
export interface CalendarProvider {
	listCalendars(): Promise<CalendarSummary[]>;
	getEvents(options: GetEventsOptions): Promise<CalendarEvent[]>;
	createEvent(calendarId: string, event: CreateEventInput): Promise<CalendarEvent>;
	getFreeBusy(request: FreeBusyRequest): Promise<CalendarFreeBusy[]>;
}
