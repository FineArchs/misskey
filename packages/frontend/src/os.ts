/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

// TODO: なんでもかんでもos.tsに突っ込むのやめたいのでよしなに分割する

import { markRaw, ref, defineAsyncComponent, nextTick } from 'vue';
import { EventEmitter } from 'eventemitter3';
import * as Misskey from 'misskey-js';
import type { Component, Ref } from 'vue';
import type { ComponentEmit, ComponentProps as CP } from 'vue-component-type-helpers';
import type { Form, GetFormResultType } from '@/utility/form.js';
import type { MenuItem } from '@/types/menu.js';
import type { PostFormProps } from '@/types/post-form.js';
import type { UploaderFeatures } from '@/composables/use-uploader.js';
import type MkRoleSelectDialog_TypeReferenceOnly from '@/components/MkRoleSelectDialog.vue';
import type MkEmojiPickerDialog_TypeReferenceOnly from '@/components/MkEmojiPickerDialog.vue';
import { prefer } from '@/preferences.js';
import { i18n } from '@/i18n.js';
import MkPostFormDialog from '@/components/MkPostFormDialog.vue';
import MkWaitingDialog from '@/components/MkWaitingDialog.vue';
import MkPopupMenu from '@/components/MkPopupMenu.vue';
import MkContextMenu from '@/components/MkContextMenu.vue';
import { pleaseLogin } from '@/utility/please-login.js';
import { showMovedDialog } from '@/utility/show-moved-dialog.js';
import { getHTMLElementOrNull } from '@/utility/get-dom-node-or-null.js';
import { focusParent } from '@/utility/focus.js';
export { apiWithDialog, type ApiWithDialogCustomErrors } from '@/modals/api-with-dialog.js';
export { alert, confirm, actions, inputText, inputNumber, inputDatetime, select } from '@/modals/simple-dialogs.js';
export { pageWindow } from '@/modals/page-window.vue';
export { toast } from '@/modals/toast.vue';

export const openingWindowsCount = ref(0);

export function promiseDialog<T extends Promise<any>>(
	promise: T,
	onSuccess?: ((res: Awaited<T>) => void) | null,
	onFailure?: ((err: Misskey.api.APIError) => void) | null,
	text?: string,
): T {
	const showing = ref(true);
	const success = ref(false);

	promise.then(res => {
		if (onSuccess) {
			showing.value = false;
			onSuccess(res);
		} else {
			success.value = true;
			window.setTimeout(() => {
				showing.value = false;
			}, 1000);
		}
	}).catch(err => {
		showing.value = false;
		if (onFailure) {
			onFailure(err);
		} else {
			alert({
				type: 'error',
				text: err,
			});
		}
	});

	// NOTE: dynamic importすると挙動がおかしくなる(showingの変更が伝播しない)
	const { dispose } = popup(MkWaitingDialog, {
		success: success,
		showing: showing,
		text: text,
	}, {
		closed: () => dispose(),
	});

	return promise;
}

let popupIdCount = 0;
export const popups = ref<{
	id: number;
	component: Component;
	props: Record<string, any>;
	events: Record<string, any>;
}[]>([]);

const zIndexes = {
	veryLow: 500000,
	low: 1000000,
	middle: 2000000,
	high: 3000000,
};
export function claimZIndex(priority: keyof typeof zIndexes = 'low'): number {
	zIndexes[priority] += 100;
	return zIndexes[priority];
}

// props に ref を許可するようにする
type ComponentProps<T extends Component> = { [K in keyof CP<T>]: CP<T>[K] | Ref<CP<T>[K]> };

export function popup<T extends Component>(
	component: T,
	props: ComponentProps<T>,
	events: Partial<ComponentEmit<T>> = {},
): { dispose: () => void } {
	markRaw(component);

	const id = ++popupIdCount;
	const dispose = () => {
		// このsetTimeoutが無いと挙動がおかしくなる(autocompleteが閉じなくなる)。Vueのバグ？
		window.setTimeout(() => {
			popups.value = popups.value.filter(p => p.id !== id);
		}, 0);
	};
	const state = {
		component,
		props,
		events,
		id,
	};

	popups.value.push(state);

	return {
		dispose,
	};
}

export async function popupAsyncWithDialog<T extends Component>(
	componentFetching: Promise<T>,
	props: ComponentProps<T>,
	events: Partial<ComponentEmit<T>> = {},
): Promise<{ dispose: () => void }> {
	let component: T;
	let closeWaiting = () => {};

	const timer = window.setTimeout(() => {
		closeWaiting = waiting();
	}, 100); // コンポーネントがキャッシュされている場合にもwaitingが表示されて画面がちらつくのを防止するためにラグを追加

	try {
		component = await componentFetching;
	} catch (err) {
		window.clearTimeout(timer);
		closeWaiting();
		alert({
			type: 'error',
			title: i18n.ts.somethingHappened,
			text: 'CODE: ASYNC_COMP_LOAD_FAIL',
		});
		throw err;
	}

	window.clearTimeout(timer);
	closeWaiting();

	markRaw(component);

	const id = ++popupIdCount;
	const dispose = () => {
		// このsetTimeoutが無いと挙動がおかしくなる(autocompleteが閉じなくなる)。Vueのバグ？
		window.setTimeout(() => {
			popups.value = popups.value.filter(p => p.id !== id);
		}, 0);
	};
	const state = {
		component,
		props,
		events,
		id,
	};

	popups.value.push(state);

	return {
		dispose,
	};
}

export function authenticateDialog(): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: { password: string; token: string | null; };
}> {
	return new Promise(resolve => {
		const { dispose } = popup(defineAsyncComponent(() => import('@/components/MkPasswordDialog.vue')), {}, {
			done: result => {
				resolve(result ? { canceled: false, result } : { canceled: true, result: undefined });
			},
			closed: () => dispose(),
		});
	});
}

export function success(): Promise<void> {
	return new Promise(resolve => {
		const showing = ref(true);
		window.setTimeout(() => {
			showing.value = false;
		}, 1000);
		const { dispose } = popup(MkWaitingDialog, {
			success: true,
			showing: showing,
		}, {
			done: () => resolve(),
			closed: () => dispose(),
		});
	});
}

export function waiting(options: { text?: string } = {}) {
	window.document.body.setAttribute('inert', 'true');

	const showing = ref(true);
	const isSuccess = ref(false);

	function done(doneOptions: { success?: boolean } = {}) {
		if (doneOptions.success) {
			isSuccess.value = true;
			window.setTimeout(() => {
				showing.value = false;
			}, 1000);
		} else {
			showing.value = false;
		}
	}

	// NOTE: dynamic importすると挙動がおかしくなる(showingの変更が伝播しない)
	const { dispose } = popup(MkWaitingDialog, {
		success: isSuccess,
		showing: showing,
		text: options.text,
	}, {
		closed: () => {
			window.document.body.removeAttribute('inert');
			dispose();
		},
	});

	return done;
}

export function form<F extends Form>(title: string, f: F): Promise<{ canceled: true, result?: undefined } | { canceled?: false, result: GetFormResultType<F> }> {
	return new Promise(resolve => {
		const { dispose } = popup(defineAsyncComponent(() => import('@/components/MkFormDialog.vue')), { title, form: f }, {
			done: result => {
				resolve(result);
			},
			closed: () => dispose(),
		});
	});
}

export async function selectUser(opts: { includeSelf?: boolean; localOnly?: boolean; } = {}): Promise<Misskey.entities.UserDetailed> {
	return new Promise(resolve => {
		const { dispose } = popup(defineAsyncComponent(() => import('@/components/MkUserSelectDialog.vue')), {
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
		const { dispose } = popup(defineAsyncComponent(() => import('@/components/MkRoleSelectDialog.vue')), params, {
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

export async function pickEmoji(anchorElement: HTMLElement, opts: ComponentProps<typeof MkEmojiPickerDialog_TypeReferenceOnly>): Promise<string> {
	return new Promise(resolve => {
		const { dispose } = popup(defineAsyncComponent(() => import('@/components/MkEmojiPickerDialog.vue')), {
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
		const { dispose } = popup(defineAsyncComponent(() => import('@/components/MkCropperDialog.vue')), {
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

export function popupMenu(items: (MenuItem | null)[], anchorElement?: HTMLElement | EventTarget | null, options?: {
	align?: string;
	width?: number;
	onClosing?: () => void;
}): Promise<void> {
	if (!(anchorElement instanceof HTMLElement)) {
		anchorElement = null;
	}

	let returnFocusTo = getHTMLElementOrNull(anchorElement) ?? getHTMLElementOrNull(window.document.activeElement);
	return new Promise(resolve => nextTick(() => {
		const { dispose } = popup(MkPopupMenu, {
			items: items.filter(x => x != null),
			anchorElement,
			width: options?.width,
			align: options?.align,
			returnFocusTo,
		}, {
			closed: () => {
				resolve();
				dispose();
				returnFocusTo = null;
			},
			closing: () => {
				options?.onClosing?.();
			},
		});
	}));
}

export function contextMenu(items: MenuItem[], ev: MouseEvent): Promise<void> {
	if (
		prefer.s.contextMenu === 'native' ||
		(prefer.s.contextMenu === 'appWithShift' && !ev.shiftKey)
	) {
		return Promise.resolve();
	}

	let returnFocusTo = getHTMLElementOrNull(ev.currentTarget ?? ev.target) ?? getHTMLElementOrNull(window.document.activeElement);
	ev.preventDefault();
	return new Promise(resolve => nextTick(() => {
		const { dispose } = popup(MkContextMenu, {
			items,
			ev,
		}, {
			closed: () => {
				resolve();
				dispose();

				// MkModalを通していないのでここでフォーカスを戻す処理を行う
				if (returnFocusTo != null) {
					focusParent(returnFocusTo, true, false);
					returnFocusTo = null;
				}
			},
		});
	}));
}

export function post(props: PostFormProps = {}): Promise<void> {
	pleaseLogin({
		openOnRemote: (props.initialText || props.initialNote ? {
			type: 'share',
			params: {
				text: props.initialText ?? props.initialNote?.text ?? '',
				visibility: props.initialVisibility ?? props.initialNote?.visibility ?? 'public',
				localOnly: (props.initialLocalOnly || props.initialNote?.localOnly) ? '1' : '0',
			},
		} : undefined),
	});

	showMovedDialog();
	return new Promise(resolve => {
		// NOTE: MkPostFormDialogをdynamic importするとiOSでテキストエリアに自動フォーカスできない
		// NOTE: ただ、dynamic importしない場合、MkPostFormDialogインスタンスが使いまわされ、
		//       Vueが渡されたコンポーネントに内部的に__propsというプロパティを生やす影響で、
		//       複数のpost formを開いたときに場合によってはエラーになる
		//       もちろん複数のpost formを開けること自体Misskeyサイドのバグなのだが
		const { dispose } = popup(MkPostFormDialog, props, {
			closed: () => {
				resolve();
				dispose();
			},
		});
	});
}

export const deckGlobalEvents = new EventEmitter();

/*
export function checkExistence(fileData: ArrayBuffer): Promise<any> {
	return new Promise((resolve, reject) => {
		const data = new FormData();
		data.append('md5', getMD5(fileData));

		api('drive/files/find-by-hash', {
			md5: getMD5(fileData)
		}).then(resp => {
			resolve(resp.length > 0 ? resp[0] : null);
		});
	});
}*/

export function chooseFileFromPc(
	options: {
		multiple?: boolean;
	} = {},
): Promise<File[]> {
	return new Promise((res, rej) => {
		const input = window.document.createElement('input');
		input.type = 'file';
		input.multiple = options.multiple ?? false;
		input.onchange = () => {
			if (!input.files) return res([]);

			res(Array.from(input.files));

			// 一応廃棄
			(window as any).__misskey_input_ref__ = null;
		};

		// https://qiita.com/fukasawah/items/b9dc732d95d99551013d
		// iOS Safari で正常に動かす為のおまじない
		(window as any).__misskey_input_ref__ = input;

		input.click();
	});
}

export function launchUploader(
	files: File[],
	options?: {
		folderId?: string | null;
		multiple?: boolean;
		features?: UploaderFeatures;
	},
): Promise<Misskey.entities.DriveFile[]> {
	return new Promise(async (res, rej) => {
		if (files.length === 0) return rej();
		const { dispose } = await popupAsyncWithDialog(import('@/components/MkUploaderDialog.vue').then(x => x.default), {
			files: markRaw(files),
			folderId: options?.folderId,
			multiple: options?.multiple,
			features: options?.features,
		}, {
			done: driveFiles => {
				if (driveFiles.length === 0) return rej();
				res(driveFiles);
			},
			closed: () => dispose(),
		});
	});
}

export const pageFolderTeleportCount = ref(0);
