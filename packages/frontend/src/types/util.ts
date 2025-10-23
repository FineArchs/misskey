import type { Component. Ref } from 'vue';
import type { ComponentEmit, ComponentProps } from 'vue-component-type-helpers';

// props に ref を許可するようにする
export type ComponentMaybeRefProps<T extends Component> = { [K in keyof CP<T>]: CP<T>[K] | Ref<CP<T>[K]> };
