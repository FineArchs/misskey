<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<script lang="ts">
import { defineComponent, computed, inject } from 'vue';
import { nyaize as doNyaize } from '@/scripts/nyaize.js';

export default defineComponent({
  name: 'MkMfmText',
  props: {
    text: { type: String, required: true },
  },
  setup(props) {
    const rootProps = inject('mfmProps');
    const text = computed(() => {
      let tmp = props.text.replace(/(\r\n|\n|\r)/g, '\n');
      if (rootProps.nyaize.value) tmp = doNyaize(tmp);
      if (rootProps.plain.value) {
        return [tmp.replace(/\n/g, ' ')];
      } else {
				const res: (VNode | string)[] = [];
				for (const t of tmp.split('\n')) {
					res.push(h('br'));
					res.push(t);
				}
				res.shift();
				return res;
      }
    });
    return computed.value;
  }
});
</script>
