/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

import MkSimpleDialog from './simple-dialog.vue';
import { popup } from '@/os.js';
import type { MkSelectItem, OptionValue } from '@/components/MkSelect.vue';

export function alert(props: {
	type?: 'error' | 'info' | 'success' | 'warning' | 'waiting' | 'question';
	title?: string;
	text?: string;
}): Promise<void> {
	return new Promise(resolve => {
		const { dispose } = popup(MkSimpleDialog, props, {
			done: () => {
				resolve();
			},
			closed: () => dispose(),
		});
	});
}

export function confirm(props: {
	type: 'error' | 'info' | 'success' | 'warning' | 'waiting' | 'question';
	title?: string;
	text?: string;
	okText?: string;
	cancelText?: string;
}): Promise<{ canceled: boolean }> {
	return new Promise(resolve => {
		const { dispose } = popup(MkSimpleDialog, {
			...props,
			showCancelButton: true,
		}, {
			done: result => {
				resolve(result ? result : { canceled: true });
			},
			closed: () => dispose(),
		});
	});
}

// TODO: const T extends ... にしたい
// https://zenn.dev/general_link/articles/813e47b7a0eef7#const-type-parameters
export function actions<T extends {
	value: string;
	text: string;
	primary?: boolean,
	danger?: boolean,
}[]>(props: {
	type: 'error' | 'info' | 'success' | 'warning' | 'waiting' | 'question';
	title?: string;
	text?: string;
	actions: T;
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: T[number]['value'];
}> {
	return new Promise(resolve => {
		const { dispose } = popup(MkSimpleDialog, {
			...props,
			actions: props.actions.map(a => ({
				text: a.text,
				primary: a.primary,
				danger: a.danger,
				callback: () => {
					resolve({ canceled: false, result: a.value });
				},
			})),
		}, {
			done: result => {
				resolve(result ? result : { canceled: true });
			},
			closed: () => dispose(),
		});
	});
}

// default が指定されていたら result は null になり得ないことを保証する overload function
export function inputText(props: {
	type?: 'text' | 'email' | 'password' | 'url';
	title?: string;
	text?: string;
	placeholder?: string | null;
	autocomplete?: string;
	default: string;
	minLength?: number;
	maxLength?: number;
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: string;
}>;
// min lengthが指定されてたら result は null になり得ないことを保証する overload function
export function inputText(props: {
	type?: 'text' | 'email' | 'password' | 'url';
	title?: string;
	text?: string;
	placeholder?: string | null;
	autocomplete?: string;
	default?: string;
	minLength: number;
	maxLength?: number;
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: string;
}>;
export function inputText(props: {
	type?: 'text' | 'email' | 'password' | 'url';
	title?: string;
	text?: string;
	placeholder?: string | null;
	autocomplete?: string;
	default?: string | null;
	minLength?: number;
	maxLength?: number;
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: string | null;
}>;
export function inputText(props: {
	type?: 'text' | 'email' | 'password' | 'url';
	title?: string;
	text?: string;
	placeholder?: string | null;
	autocomplete?: string;
	default?: string | null;
	minLength?: number;
	maxLength?: number;
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: string | null;
}> {
	return new Promise(resolve => {
		const { dispose } = popup(MkSimpleDialog, {
			title: props.title,
			text: props.text,
			input: {
				type: props.type,
				placeholder: props.placeholder,
				autocomplete: props.autocomplete,
				default: props.default ?? null,
				minLength: props.minLength,
				maxLength: props.maxLength,
			},
		}, {
			done: result => {
				resolve(result ? result : { canceled: true });
			},
			closed: () => dispose(),
		});
	});
}

// default が指定されていたら result は null になり得ないことを保証する overload function
export function inputNumber(props: {
	title?: string;
	text?: string;
	placeholder?: string | null;
	autocomplete?: string;
	default: number;
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: number;
}>;
export function inputNumber(props: {
	title?: string;
	text?: string;
	placeholder?: string | null;
	autocomplete?: string;
	default?: number | null;
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: number | null;
}>;
export function inputNumber(props: {
	title?: string;
	text?: string;
	placeholder?: string | null;
	autocomplete?: string;
	default?: number | null;
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: number | null;
}> {
	return new Promise(resolve => {
		const { dispose } = popup(MkSimpleDialog, {
			title: props.title,
			text: props.text,
			input: {
				type: 'number',
				placeholder: props.placeholder,
				autocomplete: props.autocomplete,
				default: props.default ?? null,
			},
		}, {
			done: result => {
				resolve(result ? result : { canceled: true });
			},
			closed: () => dispose(),
		});
	});
}

export function inputDatetime(props: {
	title?: string;
	text?: string;
	placeholder?: string | null;
	default?: string | null;
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: Date;
}> {
	return new Promise(resolve => {
		const { dispose } = popup(MkSimpleDialog, {
			title: props.title,
			text: props.text,
			input: {
				type: 'datetime-local',
				placeholder: props.placeholder,
				default: props.default ?? null,
			},
		}, {
			done: result => {
				resolve(result != null && result.result != null ? { result: new Date(result.result), canceled: false } : { result: undefined, canceled: true });
			},
			closed: () => dispose(),
		});
	});
}

export function select<C extends OptionValue, D extends C | null = null>(props: {
	title?: string;
	text?: string;
	default?: D;
	items: (MkSelectItem<C> | undefined)[];
}): Promise<{
	canceled: true; result: undefined;
} | {
	canceled: false; result: Exclude<D, undefined> extends null ? C | null : C;
}> {
	return new Promise(resolve => {
		const { dispose } = popup(MkSimpleDialog, {
			title: props.title,
			text: props.text,
			select: {
				items: props.items.filter(x => x !== undefined),
				default: props.default ?? null,
			},
		}, {
			done: result => {
				resolve(result ? result : { canceled: true });
			},
			closed: () => dispose(),
		});
	});
}
