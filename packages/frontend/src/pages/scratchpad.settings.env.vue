<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkRadios v-model="currentPreset">
	<template #label>{{ i18n.ts.scratchpadSettings_lib }}</template>
	<option v-for="[i, preset] in presetsOptions" :value="i">{{ preset.name }}</option>
</MkRadios>
<MkSwitch v-for="key in libKeys" v-model="currentLibsSwitches[key]">
	<template #label>{{ libNames[key] }}</template>
</MkSwitch>
<MkSwitch v-if="currentLibsSwitches.mk" v-model="withCredential">
	<template #label>{{ i18n.ts.withCredential }}</template>
</MkSwitch>
</template>

<script lang="ts">
import { computed, reactive } from 'vue';
import MkRadios from '@/components/MkRadios.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';


const libKeys = ["mk", "ui", "play"] as const;
export type LibKey = typeof libKeys[number];
export type EnvSetting = {
	libs: LibKey[];
	withCredential?: boolean;
};

// i18nのインライン化を邪魔しないようにi18n.ts.[`scratchpadLib_${key}`]は使わない
const libNames: Record<LibKey, any> = {
	mk: i18n.ts.scratchpadLib_mk,
	ui: i18n.ts.scratchpadLib_ui,
	play: i18n.ts.scratchpadLib_play,
};
const presetsDef: {
	name: string,
	libs: LibKey[],
	withCredential?: boolean,
}[] = [
	{
		name: i18n.ts.default,
		libs: ["mk", "ui"],
	},
	{
		name: i18n.ts.flash,
		libs: ["mk", "ui", "play"],
	},
	{
		name: i18n.ts.scratchpadLibPreset_console,
		libs: ["mk"],
		withCredential: true,
	},
	{
		name: i18n.ts.scratchpadLibPreset_app,
		libs: ["mk", "ui"],
		withCredential: true,
	},
	{
		name: i18n.ts.none,
		libs: [],
	},
];
const presetsOptions: [number | null, {
	name: typeof i18n["ts"][any],
}][] = [
	...presetsDef.entries(),
	[null, { name: i18n.ts.custom }]
];

export const envDefault = presetsDef[0];
</script>

<script lang="ts" setup>
const current = defineModel<EnvSetting>({ required: true });
const currentLibs = computed<LibKey[]>({
	get() { return current.value.libs; },
	set(newval) { current.value = { ...current.value, libs: newval }; }
});
const withCredential = computed<boolean>({
	get() { return current.value.withCredential ?? false; },
	set(newval) { current.value = { ...current.value, withCredential: newval }; }
});

const currentLibsSwitches = reactive(Object.fromEntries(
	libKeys.map(key => [key, computed<boolean>({
		get() {
			return currentLibs.value.includes(key);
		},
		set(newval) {
			if (newval === currentLibs.value.includes(key)) return;
			// 一応順序を維持する設計
			currentLibs.value = libKeys.filter(k => {
				if (k === key) return newval;
				return currentLibs.value.includes(k);
			});
		},
	})])
));
const currentPreset = computed<number | null>({
	get() {
		const idx = presetsDef.findIndex(preset =>
			!!preset.withCredential === withCredential.value
			&& libKeys.every(key =>
				preset.libs.includes(key) === currentLibs.value.includes(key)
			)
		);
		return idx === -1 ? null : idx;
	},
	set(val) {
		if (val == null) return;
		current.value = presetsDef[val];
	}
});
</script>
