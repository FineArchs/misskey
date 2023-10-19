/*
 * SPDX-FileCopyrightText: syuilo and other misskey contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import * as Misskey from 'misskey-js';
import { ref } from 'vue';
import { apiUrl } from '@/config.js';
import { $i } from '@/account.js';
export const pendingApiRequestsCount = ref(0);

// Implements Misskey.api.ApiClient.request
export function api<E extends keyof Misskey.Endpoints, P extends Misskey.Endpoints[E]['req']>(endpoint: E, data: P = {} as any, token?: string | null | undefined, signal?: AbortSignal): Promise<Misskey.Endpoints[E]['res']> {
	if (endpoint.includes('://')) throw new Error('invalid endpoint');
	pendingApiRequestsCount.value++;

	const onFinally = () => {
		pendingApiRequestsCount.value--;
	};

	const promise = new Promise<Misskey.Endpoints[E]['res'] | void>((resolve, reject) => {
		// Append a credential
		if ($i) (data as any).i = $i.token;
		if (token !== undefined) (data as any).i = token;

		// Send request
		window.fetch(`${apiUrl}/${endpoint}`, {
			method: 'POST',
			body: JSON.stringify(data),
			credentials: 'omit',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json',
			},
			signal,
		}).then(async (res) => {
			const body = res.status === 204 ? null : await res.json();

			if (res.status === 200) {
				resolve(body);
			} else if (res.status === 204) {
				resolve();
			} else {
				reject(body.error);
			}
		}).catch(reject);
	});

	promise.then(onFinally, onFinally);

	return promise;
}

export async function apiExternal<E extends keyof Misskey.Endpoints, P extends Misskey.Endpoints[E]['req']>(host: string, endpoint: E, data: P = {} as any, token?: string | null | undefined, signal?: AbortSignal): Promise<Misskey.Endpoints[E]['res']> {
	if (endpoint.includes('://')) throw new Error('invalid endpoint');
	const [hostName, hostUrl] = await (new Promise(resolve => resolve(URL(host))))
		.then(url => {
			if (['http:', 'https:'].includes(url.protocol)) return [url.host, host];
			else throw new Error('Only http and https are allowed as url protocol.');
		}, err => {
			if (err instanceof TypeError) return [host, 'https://' + host];
			else throw err;
		});
	const serverInfo = await api('federation/show-instance', { host: hostName });
	if ((!serverInfo) || serverInfo.isBlocked) throw new Error(hostName + 'is blocked by or not known to this server.');

	const sendReq = (endp: string) => new Promise<Misskey.Endpoints[E]['res'] | void>((resolve, reject) => {
		pendingApiRequestsCount.value++;
		const onFinally = () => {
			pendingApiRequestsCount.value--;
		};
		const fullUrl = (hostUrl.slice(-1) === '/' ? hostUrl.slice(0, -1) : hostUrl)
				+ '/api/' + (endp.slice(0, 1) === '/' ? endp.slice(1) : endp);
		window.fetch(fullUrl, {
			method: 'POST',
			body: JSON.stringify(data),
			credentials: 'omit',
			cache: 'no-cache',
			headers: {
				'Content-Type': 'application/json',
			},
			signal,
		}).then(async (res) => {
			const body = res.status === 204 ? null : await res.json();

			if (res.status === 200) {
				resolve(body);
			} else if (res.status === 204) {
				resolve();
			} else {
				reject(body.error);
			}
		}).catch(reject).then(onFinally, onFinally);
	});

	// misskeyであるかの確認
	return sendReq('federation/show-instance')
		.then(res => {
			if ((!serverInfo) || serverInfo.isBlocked) throw new Error(hostName + 'is blocking or does not know this server.');
			else return sendReq(endpoint);
		}, err => {
			throw new Error(hostName + 'might not be responding or not a misskey server.');
		});
}

// Implements Misskey.api.ApiClient.request
export function apiGet <E extends keyof Misskey.Endpoints, P extends Misskey.Endpoints[E]['req']>(endpoint: E, data: P = {} as any): Promise<Misskey.Endpoints[E]['res']> {
	pendingApiRequestsCount.value++;

	const onFinally = () => {
		pendingApiRequestsCount.value--;
	};

	const query = new URLSearchParams(data as any);

	const promise = new Promise<Misskey.Endpoints[E]['res'] | void>((resolve, reject) => {
		// Send request
		window.fetch(`${apiUrl}/${endpoint}?${query}`, {
			method: 'GET',
			credentials: 'omit',
			cache: 'default',
		}).then(async (res) => {
			const body = res.status === 204 ? null : await res.json();

			if (res.status === 200) {
				resolve(body);
			} else if (res.status === 204) {
				resolve();
			} else {
				reject(body.error);
			}
		}).catch(reject);
	});

	promise.then(onFinally, onFinally);

	return promise;
}
