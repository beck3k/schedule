const DEFAULT_HEADERS = {
	'Access-Control-Allow-Methods': 'GET, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

export function corsHeaders(request: Request, allowedOrigins?: string): HeadersInit {
	const origin = request.headers.get('Origin');
	const allowed = (allowedOrigins ?? '*')
		.split(',')
		.map((value) => value.trim())
		.filter(Boolean);

	let allowOrigin = '*';
	if (allowed.includes('*')) {
		allowOrigin = '*';
	} else if (origin && allowed.includes(origin)) {
		allowOrigin = origin;
	} else if (allowed.length > 0) {
		allowOrigin = allowed[0];
	}

	return {
		...DEFAULT_HEADERS,
		'Access-Control-Allow-Origin': allowOrigin,
	};
}
