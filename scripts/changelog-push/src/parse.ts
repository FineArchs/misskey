import { priorClauseKinds, priorItemKinds } from './push-changelog.js';
import type { PriorClauseKinds, PriorItemKinds } from './push-changelog.js';

type CommonKind = `common/${string}`;
export type StrictParsedClause = {
	kind: `prior/${PriorClauseKinds}` | CommonKind | 'nokind',
	items: StrictParsedItem[],
};
export type ParsedClause = {
	kind: StrictParsedClause['kind'] | 'empty' | 'invalid',
	items: ParsedItem[],
};

export type StrictParsedItem = {
	kind: `prior/${PriorItemKinds}` | CommonKind | 'nokind',
	text: string,
};
export type ParsedItem = {
	kind: StrictParsedItem['kind'] | 'empty' | 'invalid',
	text: string,
};

function incl<T>(arr: readonly T[], item: unknown): item is T {
	return arr.includes(item as any);
}

// Compared to parseInsertion, parseBase is designed to be lossless and format error tolerant.
export function parseBase(text: string): ParsedClause[] {
	const lines = text.split('\n');
	const result: ParsedClause[] = [];

	// TODO leading/trailing empty
	for (const line of lines) {
		const lastClause = result.at(-1);
		const lastItem = lastClause?.items?.at?.(-1);

		function newClause(kind: ParsedClause['kind']) {
			result.push({ kind, items: [] });
		}
		function newItem(kind: ParsedItem['kind']): void {
			if (!lastClause) newClause('nokind');
			lastClause!.items.push({ kind, text: line });
		}
		function continueItem(kind?: ParsedItem['kind']): void {
			if (!lastItem) newItem(kind ?? 'invalid');
			else if (kind === undefined) {
				if (lastItem.kind === 'empty') newItem('invalid');
				else lastItem.text += `\n${line}`;
			}
			else if (lastItem.kind !== kind) newItem(kind);
			else lastItem.text += `\n${line}`;
		}

		if (line.startsWith('### ')) {
			const kindtext = line.slice(4);
			newClause(
				incl(priorClauseKinds, kindtext)
				? `prior/${kindtext}` : `common/${kindtext}`
			);
			continue;
		}
		if (line.startsWith('- ')) {
			const kindtext = line.match(/^- ([\w +-\/()]+?): /)?.[1] ?? '';
			continueItem(
				incl(priorItemKinds, kindtext)
				? `prior/${kindtext}` : `common/${kindtext}`
			);
			continue;
		}
		// 空行はまとめる
		if (line.trim() === '') continueItem('empty');
		// 空行でなければ前itemの続きとみなす
		else continueItem();
	}
	return result;
}

export function parseInsertion(text: string): StrictParsedClause[] {
	const lines = text.replaceAll(/<!--.*?-->/g, '').split('\n');
	const resultMap = new Map<StrictParsedClause['kind'], Map<StrictParsedItem['kind'], string>>();
	let clauseKind: StrictParsedClause['kind'] = 'nokind';
	let pendingItem: null | StrictParsedItem = null;

	function commitPendingItem() {
		if (pendingItem == null) return;
		if (!resultMap.has(clauseKind)) resultMap.set(clauseKind, new Map());

		const tmp = resultMap.get(clauseKind)!;
		const itemKind = pendingItem.kind;
		const existingItem = tmp.get(itemKind);
		const newItem = pendingItem.text.trimEnd();
		// items of the same clauseKind and itemKind are concatenated here
		tmp.set(itemKind, existingItem ? `${existingItem}\n${newItem}` : newItem);
		pendingItem = null;
	}

	for (const [lineI, line] of lines.entries()) {
		const errmes = (mes: string) => `${mes} (at line ${lineI + 1}: \n\t${line}`;

		if (line.trim() === '') {
			if (pendingItem != null) pendingItem.text += `\n${line}`;
			continue;
		}
		if (line.startsWith('  ')) {
			if (pendingItem == null) throw new Error(errmes('invalid indent'));
			pendingItem.text += `\n${line}`;
			continue;
		}
		 
		commitPendingItem();

		if (line.startsWith('### ')) {
			const kindtext = line.slice(4);
			clauseKind = incl(priorClauseKinds, kindtext)
				? `prior/${kindtext}` : `common/${kindtext}`;
			continue;
		}
		if (line.startsWith('- ')) {
			const kindtext = line.match(/^- ([\w +-\/()]+?): /)?.[1];
			const kind: StrictParsedItem['kind'] = kindtext ? 'nokind'
				: incl(priorItemKinds, kindtext)
				? `prior/${kindtext}` : `common/${kindtext}`;
			pendingItem = { text: line, kind };
			continue;
		}

		throw new Error(errmes('invalid line'));
	}
	commitPendingItem();

	return [...resultMap.entries()].map(
		([kind, itemMap]) => ({
			kind,
			items: [...itemMap.entries()].map(
				([kind, text]) => ({ kind, text })
			)
		})
	);
}

