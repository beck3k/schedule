import { APP_NAME, HelloResponseSchema } from '@scheduler/shared';
import { msgpackResponse } from '../response';
import type { Router } from '../router';

export function registerHelloRoutes(router: Router): void {
	router.get('/hello', async ({ env, cors }) => {
		if (!env.MY_DURABLE_OBJECT) {
			return new Response('Durable Object binding missing', {
				status: 500,
				headers: cors,
			});
		}

		const stub = env.MY_DURABLE_OBJECT.getByName('foo');
		const greeting = await stub.sayHello('world');
		const body = HelloResponseSchema.parse({
			message: greeting,
			app: APP_NAME,
		});

		return msgpackResponse(body, cors);
	});
}
