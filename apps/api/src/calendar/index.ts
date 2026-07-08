import type { CalendarProvider } from '@scheduler/shared';
import { EnvCredentialsStore } from './auth/credentials';
import { loadGoogleCalendarEnv } from './auth/env';
import { GoogleCalendarClient } from './providers/google/client';
import { GoogleCalendarProvider } from './providers/google/provider';

export type { CalendarProvider } from '@scheduler/shared';
export { EnvCredentialsStore } from './auth/credentials';
export type { GoogleCalendarEnv, GoogleOAuthConfig } from './auth/env';
export { loadGoogleCalendarEnv, loadGoogleOAuthConfig, writeGoogleCredentialsToDevVars } from './auth/env';
export {
	buildGoogleAuthUrl,
	exchangeAuthorizationCode,
	GOOGLE_CALENDAR_SCOPES,
} from './providers/google/client';
export { GoogleCalendarProvider } from './providers/google/provider';

export interface CreateGoogleCalendarProviderOptions {
	getEnv?: () => Promise<import('./auth/env').GoogleCalendarEnv>;
	credentialsStore?: EnvCredentialsStore;
}

export async function createGoogleCalendarProvider(options: CreateGoogleCalendarProviderOptions = {}): Promise<CalendarProvider> {
	const getEnv = options.getEnv ?? loadGoogleCalendarEnv;
	const credentialsStore = options.credentialsStore ?? new EnvCredentialsStore({ getEnv });
	const env = await getEnv();

	const client = new GoogleCalendarClient({
		oauth: { clientId: env.clientId, clientSecret: env.clientSecret },
		getCredentials: () => credentialsStore.getCredentials(),
		setCredentials: (credentials) => credentialsStore.setCredentials(credentials),
	});

	return new GoogleCalendarProvider({ client });
}
