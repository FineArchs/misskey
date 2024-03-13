<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div :class="$style.root">
	<div v-for="log in model.logs" :key="log.id" :class="$style[log.type]">{{ log.text }}</div>
</div>
</template>

<script lang="ts">
export AsOutTL;
</script>

<script lang="ts" setup>
import { ref } from 'vue';
import { values, utils, errors } from '@syuilo/aiscript';

const model = defineModel<AsOutTL>({ required: true });

type AsOutLog = {
  type: 'out' | 'log' | 'err',
  text: string,
  id: string,
};

class AsOutTL {
  constructor(){}
  readonly logs = ref<AsOutLog[]>([]);
  private push(type: AsOutLog['type'], text: string) {
    this.logs.value.push({type, text, id: Math.random().toString()});
  }
	flush() { this.logs.value = [] }
  out(value: values.Value): void {
    this.push('out', value.type === 'str' ? value.value : utils.valToString(value));
  }
  log(type: string, params: values.Value): void {
    switch (type) {
      case 'end':
        this.push('log', utils.valToString(params.val, true));
      default: break;
    }
  }
  logManually(mes: string): void {
    this.push('log', mes);
  }
  err(err: errors.AiScriptError): void {
    this.push('err', `${err}`);
  }
}
</script>

<style lang="scss" module>
.root {
	padding: 16px;
}

.out {
}
.log {
  opacity: 0.7;
}
.err {
  color: var(--error);
}
</style>
