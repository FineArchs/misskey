<!--
SPDX-FileCopyrightText: syuilo and misskey-project
SPDX-License-Identifier: AGPL-3.0-only
-->

<template>
<div class="_gaps">
	<div class="_gaps">
		<MkInput v-model="searchQuery" :large="true" :autofocus="true" type="search" @enter="search">
			<template #prefix><i class="ti ti-search"></i></template>
		</MkInput>
		<MkFolder>
			<template #label>{{ i18n.ts.options }}</template>

			<div class="_gaps_m">
				<MkSwitch v-model="isLocalOnly">{{ i18n.ts.localOnly }}</MkSwitch>

				<MkFolder :defaultOpen="true">
					<template #label>{{ i18n.ts.specifyUser }}</template>
					<template v-if="user" #suffix>@{{ user.username }}</template>

					<div style="text-align: center;" class="_gaps">
						<div v-if="user">@{{ user.username }}</div>
						<div>
							<MkButton v-if="user == null" primary rounded inline @click="selectUser">{{ i18n.ts.selectUser }}</MkButton>
							<MkButton v-else danger rounded inline @click="user = null">{{ i18n.ts.remove }}</MkButton>
						</div>
					</div>
				</MkFolder>
			</div>
		</MkFolder>
		<div>
			<MkButton large primary gradate rounded style="margin: 0 auto;" @click="search">{{ i18n.ts.search }}</MkButton>
		</div>
	</div>

	<div v-if="lookedUpNote || lookedUpUser">
		<header>{{ i18n.ts.lookup }}</header>
		<MkNote v-if="lookedUpNote" :note="lookedUpNote"/>
		<MkUserInfo v-if="lookedUpUser" :user="lookedUpUser"/>
	</div>
	<MkFoldableSection v-if="notePagination">
		<template #header>{{ i18n.ts.searchResult }}</template>
		<MkNotes :key="key" :pagination="notePagination"/>
	</MkFoldableSection>
</div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import * as Misskey from 'misskey-js';
import MkNotes from '@/components/MkNotes.vue';
import MkInput from '@/components/MkInput.vue';
import MkButton from '@/components/MkButton.vue';
import MkSwitch from '@/components/MkSwitch.vue';
import { i18n } from '@/i18n.js';
import * as os from '@/os.js';
import { misskeyApi } from '@/scripts/misskey-api.js';
import MkFoldableSection from '@/components/MkFoldableSection.vue';
import MkFolder from '@/components/MkFolder.vue';
import { useRouter } from '@/router/supplier.js';
import MkNote from '@/components/MkNote.vue';
import MkUserInfo from '@/components/MkUserInfo.vue';

const router = useRouter();

const key = ref(0);
const searchQuery = ref('');
const searchOrigin = ref('combined');
const notePagination = ref();
const user = ref<any>(null);
const isLocalOnly = ref(false);
const lookedUpNote = ref<null | Misskey.entities.Note>(null);
const lookedUpUser = ref<null | Misskey.entities.UserDetailed>(null);

function selectUser() {
	os.selectUser({ includeSelf: true }).then(_user => {
		user.value = _user;
	});
}

async function search() {
	lookedUpNote.value = null;
	lookedUpUser.value = null;
	const query = searchQuery.value.toString().trim();

	if (query == null || query === '') return;

	// 照会
	if (query.startsWith('https://')) {
		misskeyApi('ap/show', {
			uri: query,
		}).then(res => {
			if (res.type === 'Note') {
				lookedUpNote.value = res.object;
			} else if (res.type === 'User') {
				lookedUpUser.value = res.object;
			}
		})
	}

	notePagination.value = {
		endpoint: 'notes/search',
		limit: 10,
		params: {
			query: searchQuery.value,
			userId: user.value ? user.value.id : null,
		},
	};

	if (isLocalOnly.value) notePagination.value.params.host = '.';

	key.value++;
}
</script>
