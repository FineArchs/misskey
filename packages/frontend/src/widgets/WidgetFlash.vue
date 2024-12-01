<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<MkContainer :showHeader="widgetProps.showHeader" class="mkw-flash">
	<template #header>Play</template>
	<div :class="$style.root">
		<MkAsUi v-if="root" :component="root" :components="components" size="small"/>
	</div>
</MkContainer>
</template>

<script lang="ts" setup>
import { onMounted, Ref, ref, watch } from 'vue';
import * as Misskey from 'misskey-js';
import { Interpreter, Parser, values } from '@syuilo/aiscript';
import { useWidgetPropsManager, WidgetComponentEmits, WidgetComponentExpose, WidgetComponentProps } from './widget.js';
import * as os from '@/os.js';
import { host, url } from '@/config.js';
import { $i } from '@/account.js';
import { GetFormResultType } from '@/scripts/form.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import { aiScriptReadline, createAiScriptEnv } from '@/scripts/aiscript/api.js';
import { AsUiComponent, AsUiRoot, registerAsUiLib } from '@/scripts/aiscript/ui.js';
import MkAsUi from '@/components/MkAsUi.vue';
import MkContainer from '@/components/MkContainer.vue';

const name = 'play';

const widgetPropsDef = {
	idOrUrl: {
		type: 'string' as const,
		multiline: false,
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

const flash = ref<Misskey.entities.Flash | null>(null);
const error = ref<any>(null);

function fetchFlash() {
	flash.value = null;
	misskeyApi('flash/show', {
		flashId: props.idOrUrl.match(
      new RegExp('http[s]?://' + host + '/(\w+)')
    )[1] ?? props.idOrUrl,
	}).then(_flash => {
		flash.value = _flash;
	}).catch(err => {
		error.value = err;
	});
}

const parser = new Parser();

const root = ref<AsUiRoot>();
const components = ref<Ref<AsUiComponent>[]>([]);

async function run() {
	const aiscript = new Interpreter({
		...createAiScriptEnv({
			storageKey: 'flash:' + flash.value.id,
			token: $i?.token,
		}),
		...registerAsUiLib(components.value, (_root) => {
			root.value = _root.value;
		}),
    THIS_ID: values.STR(flash.value.id),
		THIS_URL: values.STR(`${url}/play/${flash.value.id}`),
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
		ast = parser.parse(flash.value.script);
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
