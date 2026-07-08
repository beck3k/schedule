interface GoogleCalendarBindings {
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	GOOGLE_REFRESH_TOKEN: string;
	GOOGLE_ACCESS_TOKEN?: string;
	GOOGLE_ACCESS_TOKEN_EXPIRES_AT?: string;
}

interface Env extends GoogleCalendarBindings {}
