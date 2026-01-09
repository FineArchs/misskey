<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkRadios v-model="currentPreset">
	<template #label>{{ i18n.ts.scratchpadSettings_lib }}</template>
	<option v-for="[i, label] in presetsOptions" :value="i">{{ label }}</option>
</MkRadios>

<MkSwitch v-model="current.value.libs.mk.use">
	<template #label>{{ i18n.ts.scratchpadLib_mk }}</template>
</MkSwitch>
<div :class="$style.libOpts" v-if="current.value.libs.mk.use">
	<MkSwitch v-model="current.value.libs.mk.withCredential">
		<template #label>{{ i18n.ts.withCredential }}</template>
	</MkSwitch>
</div>
<MkSwitch v-model="current.value.libs.ui.use">
	<template #label>{{ i18n.ts.scratchpadLib_ui }}</template>
</MkSwitch>
<MkSwitch v-model="current.value.libs.play.use">
	<template #label>{{ i18n.ts.scratchpadLib_play }}</template>
</MkSwitch>
</template>

<script lang="ts">
import { computed, reactive, watch, toRaw } from 'vue';
import MkRadios from '@/components/MkRadios.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';
import { deepEqual } from '@/utility/deep-equal.js';

const deleted = Symbol("objMap deleted");
type deleted = typeof deleted;
// キーと値の対応関係を維持できない
function objMap<K extends string, V, V2>(
	obj: Record<K, V>,
	cb: (v: V, k: K) => V2,
): Record<K, Exclude<V2, deleted>> {
	return Object.fromEntries(
		Object.entries(obj).map(
			([k, v]) => [k, cb(v as V, k as K)]
		).filter(([k, v]) => v !== deleted)
	) as any;
}

const libsDef = {
	mk: {
		state: {
			use: true as boolean,
			withCredential: false as boolean,
		},
	},
	ui: {
		state: {
			use: true as boolean,
		},
	},
	play: {
		state: {
			use: false as boolean,
		},
	},
} as const satisfies Record<string, {
	state: { use: boolean } & Record<string, any>;
}>;

const libKeys = Object.keys(libsDef);
export type LibKey = keyof typeof libsDef;
export type LibsState = {
	[key in LibKey]: (typeof libsDef)[key]["state"];
};
export type EnvSetting = {
	libs: LibsState;
};
export const envDefault = {
	libs: objMap(libsDef, v => v.state),
} as EnvSetting;

const presetsDef: {
	name: string,
	libs: Partial<LibsState>,
}[] = [
	{
		name: i18n.ts.default,
		libs: objMap(envDefault.libs, v => v.use ? v : deleted) as any,
	},
	{
		name: i18n.ts.flash,
		libs: {
			mk: { use: true, withCredential: false },
			ui: { use: true },
			play: { use: true },
		},
	},
	{
		name: i18n.ts.scratchpadLibPreset_console,
		libs: {
			mk: { use: true, withCredential: true },
		},
	},
	{
		name: i18n.ts.scratchpadLibPreset_app,
		libs: {
			mk: { use: true, withCredential: true },
			ui: { use: true },
		},
	},
	{
		name: i18n.ts.none,
		libs: {},
	},
];
const presetsOptions: (readonly [number | null, string])[] = [
	...presetsDef.map((v, i) => [i, v.name] as const),
	[null, i18n.ts.custom]
];
</script>

<script lang="ts" setup>
const model = defineModel<EnvSetting>({ required: true });
// optsの深度を可変にするためreactiveを使用
const current = reactive({ value: model.value });
// model->currentの反映は初回だけでいいためcurrent->modelのみ
watch(current, () => model.value = toRaw(current.value));

const currentPreset = computed<number | null>({
	get() {
		const idx = presetsDef.findIndex(preset =>
			libKeys.every(key => {
				const a = preset.libs[key];
				const b = current.value.libs[key];
				if (a == null) return !b.use;
				return deepEqual(a, b);
			})
		);
		return idx === -1 ? null : idx;
	},
	set(newval) {
		if (newval == null) return;
		for (const key of libKeys) {
			const v = presetsDef[newval].libs[key];
			if (v == null) current.value.libs[key].use = false;
			else current.value.libs[key] = v;
		}
	}
});
</script>

<style lang="scss" module>
.libOpts {
	padding: 16px;
}
</style>
