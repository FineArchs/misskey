<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkSwitch v-if="def.kind == 'switch'" v-model="store">{{ def.title }}</MkSwitch>
</template>

<script lang="ts" setup>
import { settings } from '@/settings/settings.ts';
import { defaultStore } from '@/store.js';

const props = defineProps<{
	id: keyof typeof settings;
}>();

const def = settings[props.id];
const store = computed(defaultStore.makeGetterSetter(props.id));
</script>
