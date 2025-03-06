/*
 * [CHANGELOG Structure Overview]
 *
 * ## Version1                    ┐
 * ### ClauseKind1                │          ┐
 * - ItemKind1: Content1          │          │
 * - ItemKind2: Content2          │          │Clause1
 *   - here yet part of Content2  │          │
 *                                │Release1  ┘
 * ### ClauseKind2                │          ┐
 * <!-- Comment is removed -->    │          │
 * - Content3(without ItemKind)   │          │Clause2
 * - ItemKind4: Content4          │          │
 * └─────── Item ──────┘          ┘          ┘
 *
 *
 * Release = "## " + Version + Clauses
 * Clause = "### " + ClauseKind + Items
 * Item = "- " + ItemKind + Content
 */

import { parseBase, parseInsertion } from './parse.js';
import type { ParsedClause, StrictParsedClause, ParsedItem, StrictParsedItem } from './parse.js';

export const priorClauseKinds = ['Note', 'General', 'Client', 'Server', 'Misskey.js'] as const;
export type PriorClauseKinds = typeof priorClauseKinds[number];
export const priorItemKinds = ['Feat', 'Enhance', 'Fix'] as const;
export type PriorItemKinds = typeof priorItemKinds[number];
/*
const legacyClauseKinds = ['Changes', 'Service Worker', 'Improvements', 'Bugfixes', 'TL;DR', 'Notable features', 'Special thanks', 'Known issues', 'Features'];
const legacySubClauseKinds = ['For server admins', 'For users', 'For app developers'];
const usuallyNotShownItemKinds = ['Refactor', 'Chore', 'Perf'];
*/

export function pushChangeLog(base: string, insertion: string): string {
	const { before, header, body, after } = splitByFirstRelease(base);
	const parsedB = parseBase(body);
	const parsedI = parseInsertion(insertion);
	//console.log(JSON.stringify(parsedB, null, 2));
	insert(parsedB, parsedI);
	//console.log(stringifyClauses(parsedB));
	return before + header + stringifyClauses(parsedB) + after;
}

export function splitByFirstRelease(base: string): {
	before: string,
	header: string,
	body: string,
	after: string,
} {
	const firstHeader = base.match(/^## .*?$\n?/m);
	if (firstHeader == null) {
		return { before: '', header: '', body: base, after: '' };
	}

	const start = firstHeader.index!;
	const headerEnd = start + firstHeader[0].length;

	const before = base.slice(0, start);
	if (before.match(/^### /m) || before.match(/^- /m)) {
		return { before: '', header: '', body: before, after: '' };
	}
	const header = base.slice(start, headerEnd);

	const secondHeader = base.indexOf('\n## ', start);
	const end = secondHeader > 0 ? secondHeader + 1 : base.length;

	const body = base.slice(headerEnd, end);
	const after = base.slice(end);

	return { before, header, body, after };
}

// baseを改変するので注意
function insert(base: ParsedClause[], insertion: StrictParsedClause[]): void {
	const leadingEmptyLines = (base[0]?.kind === 'empty') ? base.shift() : null;
	const trailingEmptyLines = (base.at(-1)?.kind === 'empty') ? base.pop() : null;

	for (const clause of insertion) {
		const baseClause = addClause(base, clause.kind);
		for (const item of clause.items) {
			const baseItem = addItem(baseClause.items, item.kind);
			if (baseItem.text === '') baseItem.text = item.text;
			else baseItem.text += `\n${item.text}`;
		}
	}

	if (leadingEmptyLines) base.unshift(leadingEmptyLines);
	if (trailingEmptyLines) base.push(trailingEmptyLines);
}

// 前後に空白のclauseがある場合は一時的に除いておくとよい
function addClause(base: ParsedClause[], newKind: StrictParsedClause['kind']): ParsedClause {
	// すでに該当のclauseがあればそれを返す
	const foundClause = base.find(v => v.kind === newKind);
	if (foundClause != null) return foundClause;

	function addAt(at: number): ParsedClause {
		const newClause = { kind: newKind, items: [] };
		base.splice(at, 0, newClause);
		return newClause;
	}

	const pi = priorClauseKinds.indexOf(newKind as any);

	// prior clauseではないなら末尾に追加
	if (pi === -1) return addAt(-1);

	// より上位のprior clauseがあればその次に追加
	for (const jbKind of priorClauseKinds.slice(0, pi).reverse()) {
		const jbi = base.findIndex(baseClause => baseClause.kind === jbKind);
		if (jbi !== -1) return addAt(jbi + 1);
	}

	// 上位のprior clauseがなければ先頭に追加
	return addAt(0);
}

function addItem(base: ParsedItem[], newKind: StrictParsedItem['kind']): ParsedItem {
	// すでに該当のitemがあればそれを返す
	const foundItem = base.find(v => v.kind === newKind);
	if (foundItem != null) return foundItem;

	function addAt(at: number): ParsedItem {
		const newItem = { kind: newKind, text: '' };
		base.splice(at, 0, newItem);
		return newItem;
	}

	if (base.length === 0) return addAt(0);
	if (newKind === 'nokind') return addAt(base.length);

	const pi = priorItemKinds.indexOf(newKind.slice(6) as any);

	// prior itemではないなら末尾に追加
	if (pi === -1) return addAt(base.length - (base.at(-1)!.kind === '' ? -1 : base.length));

	// より上位のprior itemがあればその次に追加
	for (const jbKind of priorItemKinds.slice(0, pi).reverse()) {
		const jbi = base.findIndex(baseItem => baseItem.kind === jbKind);
		if (jbi !== -1) return addAt(jbi + 1);
	}

	// 上位のprior itemがなければ先頭に追加
	return addAt(0);
}

function stringifyClauses(parsed: ParsedClause[]): string {
	return parsed.map(clause => 
		clause.kind == null ? '' : `### ${clause.kind}\n`
		+ clause.items.map(item => item.text).join('\n')
	).join('\n');
}
