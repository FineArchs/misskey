<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<script lang="ts">
import { nextTick } from 'vue';
import { popup } from '@/os.js';
import { getHTMLElementOrNull } from '@/utility/get-dom-node-or-null.js';
import { focusParent } from '@/utility/focus.js';
import MkContextMenu from './context-menu.vue';
import type { MenuItem } from '@/types/menu.js';

export function contextMenu(items: MenuItem[], ev: MouseEvent): Promise<void> {
	if (
		prefer.s.contextMenu === 'native' ||
		(prefer.s.contextMenu === 'appWithShift' && !ev.shiftKey)
	) {
		return Promise.resolve();
	}

	let returnFocusTo = getHTMLElementOrNull(ev.currentTarget ?? ev.target) ?? getHTMLElementOrNull(window.document.activeElement);
	ev.preventDefault();
	return new Promise(resolve => nextTick(() => {
		const { dispose } = popup(MkContextMenu, {
			items,
			ev,
		}, {
			closed: () => {
				resolve();
				dispose();

				// MkModalを通していないのでここでフォーカスを戻す処理を行う
				if (returnFocusTo != null) {
					focusParent(returnFocusTo, true, false);
					returnFocusTo = null;
				}
			},
		});
	}));
}
</script>

<template>
<Transition
	appear
	:enterActiveClass="prefer.s.animation ? $style.transition_fade_enterActive : ''"
	:leaveActiveClass="prefer.s.animation ? $style.transition_fade_leaveActive : ''"
	:enterFromClass="prefer.s.animation ? $style.transition_fade_enterFrom : ''"
	:leaveToClass="prefer.s.animation ? $style.transition_fade_leaveTo : ''"
>
	<div ref="rootEl" :class="$style.root" :style="{ zIndex }" @contextmenu.prevent.stop="() => {}">
		<MkMenu :items="items" :align="'left'" @close="emit('closed')"/>
	</div>
</Transition>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, useTemplateRef, ref } from 'vue';
import MkMenu from '@/components/MkMenu.vue';
// import type { MenuItem } from '@/types/menu.js';
import contains from '@/utility/contains.js';
import { prefer } from '@/preferences.js';
import * as os from '@/os.js';

const props = defineProps<{
	items: MenuItem[];
	ev: MouseEvent;
}>();

const emit = defineEmits<{
	(ev: 'closed'): void;
}>();

const rootEl = useTemplateRef('rootEl');

const zIndex = ref<number>(os.claimZIndex('high'));

const SCROLLBAR_THICKNESS = 16;

onMounted(() => {
	let left = props.ev.pageX + 1; // 間違って右ダブルクリックした場合に意図せずアイテムがクリックされるのを防ぐため + 1
	let top = props.ev.pageY + 1; // 間違って右ダブルクリックした場合に意図せずアイテムがクリックされるのを防ぐため + 1

	const width = rootEl.value!.offsetWidth;
	const height = rootEl.value!.offsetHeight;

	if (left + width - window.scrollX >= (window.innerWidth - SCROLLBAR_THICKNESS)) {
		left = (window.innerWidth - SCROLLBAR_THICKNESS) - width + window.scrollX;
	}

	if (top + height - window.scrollY >= (window.innerHeight - SCROLLBAR_THICKNESS)) {
		top = (window.innerHeight - SCROLLBAR_THICKNESS) - height + window.scrollY;
	}

	if (top < 0) {
		top = 0;
	}

	if (left < 0) {
		left = 0;
	}

	if (rootEl.value) {
		rootEl.value.style.top = `${top}px`;
		rootEl.value.style.left = `${left}px`;
	}

	window.document.body.addEventListener('mousedown', onMousedown);
});

onBeforeUnmount(() => {
	window.document.body.removeEventListener('mousedown', onMousedown);
});

function onMousedown(evt: Event) {
	if (!contains(rootEl.value, evt.target) && (rootEl.value !== evt.target)) emit('closed');
}
</script>

<style lang="scss" module>
.transition_fade_enterActive,
.transition_fade_leaveActive {
	transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
	transform-origin: left top;
}
.transition_fade_enterFrom,
.transition_fade_leaveTo {
	opacity: 0;
	transform: scale(0.9);
}

.root {
	position: absolute;
}
</style>
