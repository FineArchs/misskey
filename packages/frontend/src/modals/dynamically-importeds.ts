/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

/*
 * Modals that require dynamic import because they are not used very often are placed here.
 */

import { defineAsyncComponent } from 'vue';
import { popup } from '@/os.js';
import type * as Misskey from 'misskey-js';
import type { ComponentProps } from '@/os.js';
import type { Form, GetFormResultType } from '@/utility/form.js';
import type MkRoleSelectDialog_TypeReferenceOnly from './role-select-dialog.vue';
import type MkEmojiPickerDialog_TypeReferenceOnly from './emoji-picker-dialog.vue';

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

export async function selectUser(opts: { includeSelf?: boolean; localOnly?: boolean; } = {}): Promise<Misskey.entities.UserDetailed> {
	return new Promise(resolve => {
		const { dispose } = popup(defineAsyncComponent(() => import('./user-select-dialog.vue')), {
			includeSelf: opts.includeSelf,
			localOnly: opts.localOnly,
		}, {
			ok: user => {
				resolve(user);
			},
			closed: () => dispose(),
		});
	});
}

export async function selectRole(params: ComponentProps<typeof MkRoleSelectDialog_TypeReferenceOnly>): Promise<
	{ canceled: true; result: undefined; } |
	{ canceled: false; result: Misskey.entities.Role[] }
> {
	return new Promise((resolve) => {
		const { dispose } = popup(defineAsyncComponent(() => import('./role-select-dialog.vue')), params, {
			done: roles => {
				resolve({ canceled: false, result: roles });
			},
			close: () => {
				resolve({ canceled: true, result: undefined });
			},
			closed: () => dispose(),
		});
	});
}

// utility/emoji-picker, utility/reaction-pickerより簡易な用途に
// （両者も後にこちらに移動？）
export async function pickEmoji(anchorElement: HTMLElement, opts: ComponentProps<typeof MkEmojiPickerDialog_TypeReferenceOnly>): Promise<string> {
	return new Promise(resolve => {
		const { dispose } = popup(defineAsyncComponent(() => import('./emoji-picker-dialog.vue')), {
			anchorElement,
			...opts,
		}, {
			done: emoji => {
				resolve(emoji);
			},
			closed: () => dispose(),
		});
	});
}

export async function cropImageFile(imageFile: File | Blob, options: {
	aspectRatio: number | null;
}): Promise<File> {
	return new Promise(resolve => {
		const { dispose } = popup(defineAsyncComponent(() => import('./cropper-dialog.vue')), {
			imageFile: imageFile,
			aspectRatio: options.aspectRatio,
		}, {
			ok: x => {
				resolve(x);
			},
			closed: () => dispose(),
		});
	});
}
