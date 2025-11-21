/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * Modals that require dynamic import because they are not used very often are placed here.
 */

import { defineAsyncComponent } from 'vue';
import MkPasswordDialog from './password-dialog.vue';
import { popup } from '@/os.js';

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
