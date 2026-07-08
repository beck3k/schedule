import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CalendarCredentials } from '@scheduler/shared';

export interface GoogleOAuthConfig {
	clientId: string;
	clientSecret: string;
}

export interface GoogleCalendarEnv extends GoogleOAuthConfig {
	refreshToken: string;
	accessToken?: string;
	accessTokenExpiresAt?: number;
}

const DEV_VARS_PATH = join(import.meta.dirname, '../../../.dev.vars');

const ENV_KEYS = {
	clientId: 'GOOGLE_CLIENT_ID',
	clientSecret: 'GOOGLE_CLIENT_SECRET',
	refreshToken: 'GOOGLE_REFRESH_TOKEN',
	accessToken: 'GOOGLE_ACCESS_TOKEN',
	accessTokenExpiresAt: 'GOOGLE_ACCESS_TOKEN_EXPIRES_AT',
} as const;

export async function loadGoogleOAuthConfig(): Promise<GoogleOAuthConfig> {
	const env = await loadEnvValues();
	const clientId = env[ENV_KEYS.clientId];
	const clientSecret = env[ENV_KEYS.clientSecret];

	if (!clientId || !clientSecret) {
		throw new Error(
			'Missing Google OAuth credentials. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in the environment or apps/api/.dev.vars.',
		);
	}

	return { clientId, clientSecret };
}

export async function loadGoogleCalendarEnv(): Promise<GoogleCalendarEnv> {
	const oauth = await loadGoogleOAuthConfig();
	const env = await loadEnvValues();
	const refreshToken = env[ENV_KEYS.refreshToken];

	if (!refreshToken) {
		throw new Error('Missing GOOGLE_REFRESH_TOKEN. Run `bun run calendar auth` or set it as a Worker secret.');
	}

	const accessToken = env[ENV_KEYS.accessToken];
	const expiresAtRaw = env[ENV_KEYS.accessTokenExpiresAt];

	return {
		...oauth,
		refreshToken,
		accessToken,
		accessTokenExpiresAt: expiresAtRaw ? Number(expiresAtRaw) : undefined,
	};
}

export async function writeGoogleCredentialsToDevVars(credentials: CalendarCredentials): Promise<void> {
	const values = await loadEnvValues();

	if (credentials.refreshToken) {
		values[ENV_KEYS.refreshToken] = credentials.refreshToken;
	}
	if (credentials.accessToken) {
		values[ENV_KEYS.accessToken] = credentials.accessToken;
	}
	if (credentials.expiresAt) {
		values[ENV_KEYS.accessTokenExpiresAt] = String(credentials.expiresAt);
	}

	const content = `${Object.entries(values)
		.map(([key, value]) => `${key}=${value}`)
		.join('\n')}\n`;

	await writeFile(DEV_VARS_PATH, content, 'utf8');
}

async function loadEnvValues(): Promise<Record<string, string>> {
	const fromProcess = readEnvFromProcess();
	const fromDevVars = await readEnvFromDevVars();
	return { ...fromDevVars, ...fromProcess };
}

function readEnvFromProcess(): Record<string, string> {
	const values: Record<string, string> = {};
	for (const key of Object.values(ENV_KEYS)) {
		const value = process.env[key];
		if (value) {
			values[key] = value;
		}
	}
	return values;
}

async function readEnvFromDevVars(): Promise<Record<string, string>> {
	try {
		const raw = await readFile(DEV_VARS_PATH, 'utf8');
		return parseDevVars(raw);
	} catch (error) {
		if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
			return {};
		}
		throw error;
	}
}

function parseDevVars(raw: string): Record<string, string> {
	const values: Record<string, string> = {};
	for (const line of raw.split('\n')) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) {
			continue;
		}
		const separator = trimmed.indexOf('=');
		if (separator === -1) {
			continue;
		}
		const key = trimmed.slice(0, separator).trim();
		const value = trimmed.slice(separator + 1).trim();
		values[key] = value;
	}
	return values;
}

/** @deprecated Use loadGoogleOAuthConfig */
export const loadGoogleEnvConfig = loadGoogleOAuthConfig;
