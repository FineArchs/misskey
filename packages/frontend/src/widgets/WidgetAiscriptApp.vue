<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkContainer :showHeader="widgetProps.showHeader" class="mkw-aiscriptApp">
	<template #header>App</template>
	<div :class="$style.root">
		<MkAsUi :cid="'___root___'" :components="components" size="small"/>
	</div>
</MkContainer>
</template>

<script lang="ts" setup>
import { onMounted, Ref, ref, watch } from 'vue';
import { Interpreter, Parser } from '@syuilo/aiscript';
import { useWidgetPropsManager, WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget.js';
import { GetFormResultType } from '@/scripts/form.js';
import * as os from '@/os.js';
import { aiScriptReadline, createAiScriptEnv } from '@/scripts/aiscript/api.js';
import { $i } from '@/account.js';
import MkAsUi from '@/components/MkAsUi.vue';
import MkContainer from '@/components/MkContainer.vue';
import { AsUiComponent, AsUiRoot, registerAsUiLib } from '@/scripts/aiscript/ui.js';

const name = 'aiscriptApp';

const widgetPropsDef = {
	script: {
		type: 'string' as const,
		multiline: true,
		default: '',
	},
	showHeader: {
		type: 'boolean' as const,
		default: true,
	},
};

type WidgetProps = GetFormResultType<typeof widgetPropsDef>;

const props = defineProps<WidgetComponentProps<WidgetProps>>();
const emit = defineEmits<WidgetComponentEmits<WidgetProps>>();

const { widgetProps, configure } = useWidgetPropsManager(name,
	widgetPropsDef,
	props,
	emit,
);

const parser = new Parser();

const components = ref<Map<string, Ref<AsUiComponent>>>(new Map());

async function run() {
	components.value.clear();
	const aiscript = new Interpreter({
		...createAiScriptEnv({
			storageKey: 'widget',
			token: $i?.token,
		}),
		...registerAsUiLib(components.value),
	}, {
		in: aiScriptReadline,
		out: (value) => {
			// nop
		},
		log: (type, params) => {
			// nop
		},
	});

	let ast;
	try {
		ast = parser.parse(widgetProps.script);
	} catch (err) {
		os.alert({
			type: 'error',
			text: 'Syntax error :(',
		});
		return;
	}
	try {
		await aiscript.exec(ast);
	} catch (err) {
		os.alert({
			type: 'error',
			title: 'AiScript Error',
			text: err.message,
		});
	}
}

watch(() => widgetProps.script, () => {
	run();
});

onMounted(() => {
	run();
});

defineExpose<WidgetComponentExpose>({
	name,
	configure,
	id: props.widget ? props.widget.id : null,
});
</script>

<style lang="scss" module>
.root {
	padding: 16px;
}
</style>
