<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<span v-if="rootProps.nowrap" :class="$style.quote"><MkMfmElement v-for="child in node.children" :node="child"/></span>
<div v-else :class="$style.quote"><MkMfmElement v-for="child in node.children" :node="child"/></div>
</template>

<script lang="ts" setup>
import MkMfmElement from './MkMfmElement.vue';
import { ref, readonly, provide, inject } from 'vue';

const props = defineProps<{
  node: mfm.MfmNode;
}>;

const rootProps = inject('mfmProps');
provide('mfmProps', {
  ...rootProps,
  nyaize: readonly(ref(false)),
});
</script>

<style lang="scss" module>
.quote {
  display: block;
  margin: 8px;
  padding: 6px 0 6px 12px;
  color: var(--fg);
  border-left: solid 3px var(--fg);
  opacity: 0.7;
}
</style>
