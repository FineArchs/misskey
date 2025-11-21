/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * Modals that require dynamic import because they are not used very often are placed here.
 */

import { defineAsyncComponent } from 'vue';
import { popup } from '@/os.js';
import type { Form, GetFormResultType } from '@/utility/form.js';

export function authenticateDialog(): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: { password: string; token: string | null; };
}> {
	return new Promise(resolve => {
		const { dispose } = popup(defineAsyncComponent(() => import('./password-dialog.vue')), {}, {
			done: result => {
				resolve(result ? { canceled: false, result } : { canceled: true, result: undefined });
			},
			closed: () => dispose(),
		});
	});
}

export function form<F extends Form>(title: string, f: F): Promise<{ canceled: true, result?: undefined } | { canceled?: false, result: GetFormResultType<F> }> {
	return new Promise(resolve => {
		const { dispose } = popup(defineAsyncComponent(() => import('./form-dialog.vue')), { title, form: f }, {
			done: result => {
				resolve(result);
			},
			closed: () => dispose(),
		});
	});
}
