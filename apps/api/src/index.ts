import { DurableObject } from 'cloudflare:workers';
import { APP_NAME } from '@scheduler/shared';
import { corsHeaders } from './cors';
import { createRouter } from './routes';

/** A Durable Object's behavior is defined in an exported Javascript class */
export class MyDurableObject extends DurableObject<Env> {
	async sayHello(name: string): Promise<string> {
		return `Hello from ${APP_NAME}, ${name}!`;
	}
}

const router = createRouter();

export default {
	async fetch(request, env, _ctx): Promise<Response> {
		const cors = corsHeaders(request, env.ALLOWED_ORIGINS);

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: cors });
		}

		const response = await router.fetch(request, env, cors);
		if (response) {
			return response;
		}

		return new Response('Not Found', { status: 404, headers: cors });
	},
} satisfies ExportedHandler<Env>;
