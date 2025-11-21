<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<script lang="ts">
import { ref } from 'vue';
import * as Misskey from 'misskey-js';
import MkWaitingDialog from './waiting-dialogs.vue';
import { popup } from '@/os.js';

type PopupParams = Parameters<typeof popup<typeof MkWaitingDialog>>;

// popup()の第3引数が機能していないためanyに
export function waitingDialog(props: PopupParams[1], events?: any/*PopupParams[2]*/) {
	const { dispose } = popup(MkWaitingDialog, props, {
		...events,
		closed: () => { dispose(); events?.closed?.(); },
	});
}


function _success(): Promise<void> {
	return new Promise(resolve => {
		const showing = ref(true);
		window.setTimeout(() => {
			showing.value = false;
		}, 1000);
		const { dispose } = popup(MkWaitingDialog, {
			success: true,
			showing: showing,
		}, {
			done: () => resolve(),
			closed: () => dispose(),
		});
	});
}
export { _success as success };

export function waiting(options: { text?: string } = {}) {
	window.document.body.setAttribute('inert', 'true');

	const showing = ref(true);
	const isSuccess = ref(false);

	function done(doneOptions: { success?: boolean } = {}) {
		if (doneOptions.success) {
			isSuccess.value = true;
			window.setTimeout(() => {
				showing.value = false;
			}, 1000);
		} else {
			showing.value = false;
		}
	}

	// NOTE: dynamic importすると挙動がおかしくなる(showingの変更が伝播しない)
	const { dispose } = popup(MkWaitingDialog, {
		success: isSuccess,
		showing: showing,
		text: options.text,
	}, {
		closed: () => {
			window.document.body.removeAttribute('inert');
			dispose();
		},
	});

	return done;
}

export function promiseDialog<T extends Promise<any>>(
	promise: T,
	onSuccess?: ((res: Awaited<T>) => void) | null,
	onFailure?: ((err: Misskey.api.APIError) => void) | null,
	text?: string,
): T {
	const showing = ref(true);
	const success = ref(false);

	promise.then(res => {
		if (onSuccess) {
			showing.value = false;
			onSuccess(res);
		} else {
			success.value = true;
			window.setTimeout(() => {
				showing.value = false;
			}, 1000);
		}
	}).catch(err => {
		showing.value = false;
		if (onFailure) {
			onFailure(err);
		} else {
			alert({
				type: 'error',
				text: err,
			});
		}
	});

	// NOTE: dynamic importすると挙動がおかしくなる(showingの変更が伝播しない)
	const { dispose } = popup(MkWaitingDialog, {
		success: success,
		showing: showing,
		text: text,
	}, {
		closed: () => dispose(),
	});

	return promise;
}
</script>

<template>
<MkModal ref="modal" :preferType="'dialog'" :zPriority="'high'" @click="success ? done() : () => {}" @closed="emit('closed')">
	<div :class="[$style.root, { [$style.iconOnly]: (text == null) || success }]">
		<i v-if="success" :class="[$style.icon, $style.success]" class="ti ti-check"></i>
		<MkLoading v-else :class="[$style.icon, $style.waiting]" :em="true"/>
		<div v-if="text && !success" :class="$style.text">{{ text }}<MkEllipsis/></div>
	</div>
</MkModal>
</template>

<script lang="ts" setup>
import { watch, useTemplateRef } from 'vue';
import MkModal from '@/components/MkModal.vue';

const modal = useTemplateRef('modal');

const props = defineProps<{
	success: boolean;
	showing: boolean;
	text?: string | null;
}>();

const emit = defineEmits<{
	(ev: 'done');
	(ev: 'closed');
}>();

function done() {
	emit('done');
	modal.value?.close();
}

watch(() => props.showing, () => {
	if (!props.showing) done();
});
</script>

<style lang="scss" module>
.root {
	margin: auto;
	position: relative;
	padding: 32px;
	box-sizing: border-box;
	text-align: center;
	background: var(--MI_THEME-panel);
	border-radius: var(--MI-radius);
	width: 250px;

	&.iconOnly {
		padding: 0;
		width: 96px;
		height: 96px;
		display: flex;
		align-items: center;
		justify-content: center;
	}
}

.icon {
	font-size: 32px;

	&.success {
		color: var(--MI_THEME-accent);
	}

	&.waiting {
		opacity: 0.7;
	}
}

.text {
	margin-top: 16px;
}
</style>
