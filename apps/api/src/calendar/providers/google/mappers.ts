import type { CalendarEvent, CalendarFreeBusy, CalendarSummary, EventStatus } from '@scheduler/shared';
import type { GoogleBusyCalendar, GoogleCalendarListItem, GoogleEventItem } from './client';

export function mapGoogleCalendar(item: GoogleCalendarListItem): CalendarSummary {
	return {
		id: item.id ?? '',
		name: item.summary ?? '(unnamed)',
		description: item.description,
		primary: item.primary,
		timeZone: item.timeZone,
	};
}

export function mapGoogleEvent(item: GoogleEventItem, calendarId: string): CalendarEvent {
	return {
		id: item.id ?? '',
		calendarId,
		title: item.summary ?? '(no title)',
		description: item.description,
		location: item.location,
		start: item.start ?? {},
		end: item.end ?? {},
		status: mapEventStatus(item.status),
		htmlLink: item.htmlLink,
	};
}

function mapEventStatus(status?: string): EventStatus | undefined {
	if (status === 'confirmed' || status === 'tentative' || status === 'cancelled') {
		return status;
	}
	return undefined;
}

export function mapGoogleFreeBusy(calendars: Record<string, GoogleBusyCalendar>, calendarIds: string[]): CalendarFreeBusy[] {
	return calendarIds.map((calendarId) => {
		const calendar = calendars[calendarId];
		return {
			calendarId,
			busy: (calendar?.busy ?? [])
				.filter((period) => period.start && period.end)
				.map((period) => ({
					start: period.start as string,
					end: period.end as string,
				})),
		};
	});
}
