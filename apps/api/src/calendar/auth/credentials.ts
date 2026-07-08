import type { CalendarCredentials } from '@scheduler/shared';
import type { GoogleCalendarEnv } from './env';

export interface EnvCredentialsStoreOptions {
	getEnv: () => Promise<GoogleCalendarEnv>;
}

export class EnvCredentialsStore {
	private readonly getEnv: () => Promise<GoogleCalendarEnv>;
	private cache: CalendarCredentials | null = null;

	constructor(options: EnvCredentialsStoreOptions) {
		this.getEnv = options.getEnv;
	}

	async getCredentials(): Promise<CalendarCredentials> {
		if (this.cache?.accessToken && this.cache.expiresAt && this.cache.expiresAt > Date.now() + 60_000) {
			return this.cache;
		}

		const env = await this.getEnv();

		if (env.accessToken && env.accessTokenExpiresAt && env.accessTokenExpiresAt > Date.now() + 60_000) {
			return {
				accessToken: env.accessToken,
				refreshToken: env.refreshToken,
				expiresAt: env.accessTokenExpiresAt,
			};
		}

		return {
			accessToken: env.accessToken ?? '',
			refreshToken: env.refreshToken,
			expiresAt: env.accessTokenExpiresAt,
		};
	}

	async setCredentials(credentials: CalendarCredentials): Promise<void> {
		this.cache = credentials;
	}
}
