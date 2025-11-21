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
import type { PostFormProps } from '@/types/post-form.js';
import type { UploaderFeatures } from '@/composables/use-uploader.js';
import { prefer } from '@/preferences.js';
import { i18n } from '@/i18n.js';
import MkPostFormDialog from '@/components/MkPostFormDialog.vue';
import { pleaseLogin } from '@/utility/please-login.js';
import { showMovedDialog } from '@/utility/show-moved-dialog.js';
import { focusParent } from '@/utility/focus.js';
export { apiWithDialog, type ApiWithDialogCustomErrors } from '@/modals/api-with-dialog.js';
export { alert, confirm, actions, inputText, inputNumber, inputDatetime, select } from '@/modals/simple-dialogs.js';
import { waiting } from '@/modals/waiting-dialogs.vue';
export { success, waiting, promiseDialog } from '@/modals/waiting-dialogs.vue';
export { pageWindow } from '@/modals/page-window.vue';
export { popupMenu } from '@/modals/popup-menu.vue';
export { contextMenu } from '@/modals/context-menu.vue';
export { toast } from '@/modals/toast.vue';
export { authenticateDialog, form, selectUser, selectRole, pickEmoji, cropImageFile  } from '@/modals/dynamically-importeds.js';

export const openingWindowsCount = ref(0);

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
export type ComponentProps<T extends Component> = { [K in keyof CP<T>]: CP<T>[K] | Ref<CP<T>[K]> };

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
