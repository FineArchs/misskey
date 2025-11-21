<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->
<script lang="ts">
import { nextTick } from 'vue';
import { popup } from '@/os.js';
import { getHTMLElementOrNull } from '@/utility/get-dom-node-or-null.js';
import MkPopupMenu from './popup-menu.vue';
import type { MenuItem } from '@/types/menu.js';

export function popupMenu(items: (MenuItem | null)[], anchorElement?: HTMLElement | EventTarget | null, options?: {
	align?: string;
	width?: number;
	onClosing?: () => void;
}): Promise<void> {
	if (!(anchorElement instanceof HTMLElement)) {
		anchorElement = null;
	}

	let returnFocusTo = getHTMLElementOrNull(anchorElement) ?? getHTMLElementOrNull(window.document.activeElement);
	return new Promise(resolve => nextTick(() => {
		const { dispose } = popup(MkPopupMenu, {
			items: items.filter(x => x != null),
			anchorElement,
			width: options?.width,
			align: options?.align,
			returnFocusTo,
		}, {
			closed: () => {
				resolve();
				dispose();
				returnFocusTo = null;
			},
			closing: () => {
				options?.onClosing?.();
			},
		});
	}));
}
</script>

<template>
<MkModal ref="modal" v-slot="{ type, maxHeight }" :manualShowing="manualShowing" :zPriority="'high'" :anchorElement="anchorElement" :transparentBg="true" :returnFocusTo="returnFocusTo" @click="click" @close="onModalClose" @closed="onModalClosed">
	<MkMenu :items="items" :align="align" :width="width" :max-height="maxHeight" :asDrawer="type === 'drawer'" :returnFocusTo="returnFocusTo" :class="{ [$style.drawer]: type === 'drawer' }" @close="onMenuClose" @hide="hide"/>
</MkModal>
</template>

<script lang="ts" setup>
import { ref, useTemplateRef } from 'vue';
import MkModal from '@/components/MkModal.vue';
import MkMenu from '@/components/MkMenu.vue';
// import type { MenuItem } from '@/types/menu.js';

defineProps<{
	items: MenuItem[];
	align?: 'center' | string;
	width?: number;
	anchorElement?: HTMLElement | null;
	returnFocusTo?: HTMLElement | null;
}>();

const emit = defineEmits<{
	(ev: 'closed'): void;
	(ev: 'closing'): void;
}>();

const modal = useTemplateRef('modal');
const manualShowing = ref(true);
const hiding = ref(false);

function click() {
	close();
}

function onModalClose() {
	emit('closing');
}

function onMenuClose() {
	close();
	if (hiding.value) {
		// hidingであればclosedを発火
		emit('closed');
	}
}

function onModalClosed() {
	if (!hiding.value) {
		// hidingでなければclosedを発火
		emit('closed');
	}
}

function hide() {
	manualShowing.value = false;
	hiding.value = true;

	// closeは呼ぶ必要がある
	modal.value?.close();
}

function close() {
	manualShowing.value = false;

	// closeは呼ぶ必要がある
	modal.value?.close();
}
</script>

<style lang="scss" module>
.drawer {
	border-radius: 24px;
	border-bottom-right-radius: 0;
	border-bottom-left-radius: 0;
}
</style>
