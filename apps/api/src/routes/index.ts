import { Router } from '../router';
import { registerHelloRoutes } from './hello';

export function createRouter(): Router {
	const router = new Router();
	registerHelloRoutes(router);
	return router;
}
