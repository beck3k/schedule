#!/usr/bin/env bun

import { buildGoogleAuthUrl, createGoogleCalendarProvider, exchangeAuthorizationCode } from '../calendar';
import { loadGoogleOAuthConfig, writeGoogleCredentialsToDevVars } from '../calendar/auth/env';

const OAUTH_REDIRECT_PORT = 8788;
const OAUTH_REDIRECT_URI = `http://127.0.0.1:${OAUTH_REDIRECT_PORT}/oauth/callback`;

interface ParsedArgs {
	command: string;
	flags: Record<string, string | boolean>;
	positionals: string[];
}

function parseArgs(argv: string[]): ParsedArgs {
	const [command = 'help', ...rest] = argv;
	const flags: Record<string, string | boolean> = {};
	const positionals: string[] = [];

	for (let i = 0; i < rest.length; i++) {
		const arg = rest[i];
		if (!arg.startsWith('--')) {
			positionals.push(arg);
			continue;
		}

		const key = arg.slice(2);
		const next = rest[i + 1];
		if (!next || next.startsWith('--')) {
			flags[key] = true;
			continue;
		}

		flags[key] = next;
		i++;
	}

	return { command, flags, positionals };
}

function printHelp(): void {
	console.log(`Schedule calendar CLI

Usage:
  bun run calendar <command> [options]

Commands:
  auth                         Authenticate with Google Calendar (OAuth)
  calendars                    List available calendars
  events                       List events in a date range
  freebusy                     Show busy periods for one or more calendars
  help                         Show this help message

Options:
  --calendar <id>              Calendar ID (default: primary)
  --from <iso>                 Range start (ISO 8601)
  --to <iso>                   Range end (ISO 8601)
  --calendars <ids>            Comma-separated calendar IDs for freebusy
  --limit <n>                  Max events to return (default: 25)
  --json                       Print raw JSON output

Examples:
  bun run calendar auth
  bun run calendar calendars
  bun run calendar events --from 2026-07-01 --to 2026-07-31
  bun run calendar freebusy --from 2026-07-01T09:00:00-04:00 --to 2026-07-01T17:00:00-04:00
`);
}

function defaultRange(): { from: string; to: string } {
	const now = new Date();
	const start = new Date(now);
	start.setHours(0, 0, 0, 0);
	const end = new Date(start);
	end.setDate(end.getDate() + 7);
	return { from: start.toISOString(), to: end.toISOString() };
}

async function runAuth(): Promise<void> {
	const oauth = await loadGoogleOAuthConfig();
	const authUrl = buildGoogleAuthUrl(oauth.clientId, OAUTH_REDIRECT_URI);

	console.log('Opening browser for Google Calendar authorization...');
	console.log(`If the browser does not open, visit:\n${authUrl}\n`);

	const code = await waitForAuthorizationCode(authUrl);
	const credentials = await exchangeAuthorizationCode(oauth, code, OAUTH_REDIRECT_URI);

	if (!credentials.refreshToken) {
		throw new Error('Google did not return a refresh token. Revoke app access in your Google account and run auth again.');
	}

	await writeGoogleCredentialsToDevVars(credentials);

	console.log('Saved Google Calendar credentials to apps/api/.dev.vars.');
	console.log('\nFor production, set these as Worker secrets:');
	console.log('  wrangler secret put GOOGLE_CLIENT_ID');
	console.log('  wrangler secret put GOOGLE_CLIENT_SECRET');
	console.log('  wrangler secret put GOOGLE_REFRESH_TOKEN');
}

async function waitForAuthorizationCode(authUrl: string): Promise<string> {
	return new Promise((resolve, reject) => {
		const server = Bun.serve({
			port: OAUTH_REDIRECT_PORT,
			fetch(request: Request) {
				const url = new URL(request.url);
				if (url.pathname !== '/oauth/callback') {
					return new Response('Not Found', { status: 404 });
				}

				const error = url.searchParams.get('error');
				if (error) {
					reject(new Error(`OAuth error: ${error}`));
					server.stop();
					return new Response('Authentication failed. You can close this tab.', {
						status: 400,
					});
				}

				const code = url.searchParams.get('code');
				if (!code) {
					reject(new Error('OAuth callback did not include an authorization code.'));
					server.stop();
					return new Response('Missing authorization code.', { status: 400 });
				}

				resolve(code);
				server.stop();
				return new Response('Authentication successful. You can close this tab.');
			},
		});

		Bun.spawn(['open', authUrl]);
	});
}

async function runCalendars(flags: Record<string, string | boolean>): Promise<void> {
	const provider = await createGoogleCalendarProvider();
	const calendars = await provider.listCalendars();

	if (flags.json) {
		console.log(JSON.stringify(calendars, null, 2));
		return;
	}

	if (calendars.length === 0) {
		console.log('No calendars found.');
		return;
	}

	for (const calendar of calendars) {
		const tags = [calendar.primary ? 'primary' : null, calendar.timeZone ?? null].filter(Boolean).join(', ');

		console.log(`${calendar.id}${tags ? ` (${tags})` : ''}`);
		console.log(`  ${calendar.name}`);
	}
}

async function runEvents(flags: Record<string, string | boolean>): Promise<void> {
	const provider = await createGoogleCalendarProvider();
	const calendarId = String(flags.calendar ?? 'primary');
	const range = defaultRange();
	const timeMin = String(flags.from ?? range.from);
	const timeMax = String(flags.to ?? range.to);
	const maxResults = flags.limit ? Number(flags.limit) : 25;

	const events = await provider.getEvents({
		calendarId,
		timeMin,
		timeMax,
		maxResults,
	});

	if (flags.json) {
		console.log(JSON.stringify(events, null, 2));
		return;
	}

	if (events.length === 0) {
		console.log(`No events found for ${calendarId} between ${timeMin} and ${timeMax}.`);
		return;
	}

	for (const event of events) {
		const start = event.start.dateTime ?? event.start.date ?? '?';
		const end = event.end.dateTime ?? event.end.date ?? '?';
		console.log(`${start} → ${end}`);
		console.log(`  ${event.title}`);
		if (event.location) {
			console.log(`  ${event.location}`);
		}
	}
}

async function runFreeBusy(flags: Record<string, string | boolean>): Promise<void> {
	const provider = await createGoogleCalendarProvider();
	const range = defaultRange();
	const timeMin = String(flags.from ?? range.from);
	const timeMax = String(flags.to ?? range.to);
	const calendarIds = String(flags.calendars ?? 'primary')
		.split(',')
		.map((id) => id.trim())
		.filter(Boolean);

	const freeBusy = await provider.getFreeBusy({
		calendarIds,
		timeMin,
		timeMax,
	});

	if (flags.json) {
		console.log(JSON.stringify(freeBusy, null, 2));
		return;
	}

	for (const calendar of freeBusy) {
		console.log(calendar.calendarId);
		if (calendar.busy.length === 0) {
			console.log('  (free)');
			continue;
		}
		for (const period of calendar.busy) {
			console.log(`  busy ${period.start} → ${period.end}`);
		}
	}
}

async function main(): Promise<void> {
	const { command, flags } = parseArgs(process.argv.slice(2));

	try {
		switch (command) {
			case 'auth':
				await runAuth();
				break;
			case 'calendars':
				await runCalendars(flags);
				break;
			case 'events':
				await runEvents(flags);
				break;
			case 'freebusy':
				await runFreeBusy(flags);
				break;
			case 'help':
			case '--help':
			case '-h':
				printHelp();
				break;
			default:
				console.error(`Unknown command: ${command}\n`);
				printHelp();
				process.exitCode = 1;
		}
	} catch (error) {
		console.error(error instanceof Error ? error.message : error);
		process.exitCode = 1;
	}
}

await main();
