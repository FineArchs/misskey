<!--
SPDX-FileCopyrightText: syuilo and other misskey contributors
SPDX-License-Identifier: AGPL-3.0-only
-->

<!-- eslint-disable vue/no-v-html -->
<template>
<div v-if="html" :class="['codeBlockRoot', { 'codeEditor': codeEditor }]" v-html="html"></div>
<pre v-else :class="['codeBlockFallbackRoot', { 'codeEditor': codeEditor }]"><code>{{ code }}</code></pre>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import { BUNDLED_LANGUAGES } from 'shiki';
import type { Highlighter, Lang as ShikiLang } from 'shiki';
import { getHighlighter } from '@/scripts/code-highlighter.js';

const props = defineProps<{
	code: string;
	lang?: string;
	codeEditor?: boolean;
}>();

const html = ref<string | null>(null);

// setupの中でawaitするとロードが遅延されそう（多分）なのでasync関数内で実行
if (props.lang !== undefined) (async () => {
	const highlighter = await getHighlighter();
	const codeLang = await fetchLanguage(highlighter, props.lang);
	if (codeLang === null) return;
	html.value = highlighter.codeToHtml(props.code, {
		lang: codeLang,
		theme: 'dark-plus',
	});
})().catch(err => html.value=`${err}`);

// Check for the loaded languages
function isLoaded(highlighter: Highlighter, langName: string): langName is ShikiLang {
	return highlighter.getLoadedLanguages().includes(langName);
}
// Check if the language is supported by Shiki
function isBundled(langName: string): langName is ShikiLang {
	return BUNDLED_LANGUAGES.some(bundle => {
		// Languages are specified by their id, they can also have aliases (i. e. "js" and "javascript")
		return bundle.id === langName || bundle.aliases?.includes(langName);
	});
}

async function fetchLanguage(highlighter: Highlighter, langName: string): Promise<ShikiLang | null> {
	if (isLoaded(highlighter, langName)) return langName;
	else if (isBundled(langName)) {
		await highlighter.loadLanguage(langName);
		return langName;
	}
	else return null;
}
</script>

<style scoped lang="scss">
.codeBlockRoot :deep(.shiki),
.codeBlockFallbackRoot {
	padding: 1em;
	margin: .5em 0;
	overflow: auto;
	border-radius: 8px;

	& pre,
	& code {
		font-family: Consolas, Monaco, Andale Mono, Ubuntu Mono, monospace;
	}
}

.codeBlockFallbackRoot {
	display: block;
	color: #D4D4D4;
	background: #1E1E1E;
}

.codeEditor {
	min-width: 100%;
	height: 100%;

	& :deep(.shiki),
	&.codeBlockFallbackRoot {
		padding: 12px;
		margin: 0;
		border-radius: 6px;
		min-height: 130px;
		pointer-events: none;
		min-width: calc(100% - 24px);
		height: 100%;
		display: inline-block;
		line-height: 1.5em;
		font-size: 1em;
		overflow: visible;
		text-rendering: inherit;
    text-transform: inherit;
    white-space: pre;
	}
}
</style>
