export type RouteContext = {
	request: Request;
	env: Env;
	url: URL;
	cors: HeadersInit;
};

export type RouteHandler = (ctx: RouteContext) => Response | Promise<Response>;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface Route {
	method: HttpMethod;
	pattern: RegExp;
	handler: RouteHandler;
}

function pathToPattern(path: string): RegExp {
	const pattern = path.replace(/:\w+/g, '([^/]+)');
	return new RegExp(`^${pattern}$`);
}

export class Router {
	private routes: Route[] = [];

	on(method: HttpMethod, path: string, handler: RouteHandler): this {
		this.routes.push({ method, pattern: pathToPattern(path), handler });
		return this;
	}

	get(path: string, handler: RouteHandler): this {
		return this.on('GET', path, handler);
	}

	post(path: string, handler: RouteHandler): this {
		return this.on('POST', path, handler);
	}

	async fetch(request: Request, env: Env, cors: HeadersInit): Promise<Response | null> {
		const url = new URL(request.url);

		for (const route of this.routes) {
			if (route.method !== request.method) continue;
			if (!route.pattern.test(url.pathname)) continue;

			return route.handler({ request, env, url, cors });
		}

		return null;
	}
}
