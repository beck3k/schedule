import { pack, unpack } from '@scheduler/shared';
import type { z } from 'zod';

export function msgpackResponse(data: unknown, cors: HeadersInit): Response {
	return new Response(pack(data), {
		headers: {
			...cors,
			'Content-Type': 'application/msgpack',
		},
	});
}

export async function readMsgpackBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
	const buffer = await request.arrayBuffer();
	return schema.parse(unpack(buffer));
}
