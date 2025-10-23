import { useRouter, Router } from '@/router.js';
import type { Component } from 'vue';
import type { ComponentEmit } from 'vue-component-type-helpers';
import type { ComponentMaybeRefProps } from '@/types/util.js';

export type PopupData = {
	id: number;
	component: Component;
	props: Record<string, any>;
	events: Record<string, any>;
	router: Router;
};

export const popups = ref<PopupData[]>([]);
let popupIdCount = 0;

export function popup<T extends Component>(
	component: T,
	props: ComponentMaybeRefProps<T>,
	events: Partial<ComponentEmit<T>> = {},
	router?: Router,
): { dispose: () => void } {
	markRaw(component);

	const id = ++popupIdCount;
	const dispose = () => {
		// このsetTimeoutが無いと挙動がおかしくなる(autocompleteが閉じなくなる)。Vueのバグ？
		window.setTimeout(() => {
			popups.value = popups.value.filter(p => p.id !== id);
		}, 0);
	};
	const state = {
		component,
		props,
		events,
		id,
		router,
	};

	popups.value.push(state);

	return {
		dispose,
	};
}

export function useRoutedPopup() {
	const router = useRouter();
	return (...props: Parameters<typeof popup>) => {
		const [c, p, e, r] = props;
		return popup(c, p, e, r ?? router);
	}
}
