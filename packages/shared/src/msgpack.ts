import { decode, encode } from '@msgpack/msgpack';

export function pack<T>(value: T): Uint8Array {
	return encode(value);
}

export function unpack<T>(data: ArrayBuffer | Uint8Array): T {
	const bytes = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
	return decode(bytes) as T;
}
