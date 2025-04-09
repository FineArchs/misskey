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


const priorClauseKinds = ['Note', 'General', 'Client', 'Server', 'Misskey.js'] as const;
type PriorClauseKinds = typeof priorClauseKinds[number];
const priorItemKinds = ['Feat', 'Enhance', 'Fix'] as const;
type PriorItemKinds = typeof priorItemKinds[number];
/*
const legacyClauseKinds = ['Changes', 'Service Worker', 'Improvements', 'Bugfixes', 'TL;DR', 'Notable features', 'Special thanks', 'Known issues', 'Features'];
const legacySubClauseKinds = ['For server admins', 'For users', 'For app developers'];
const usuallyNotShownItemKinds = ['Refactor', 'Chore', 'Perf'];
*/

export function pushChangeLog(base: string, insertion: string): string {
	const { before, header, body, after } = splitByFirstRelease(base);
	const parsedB = parseBase(body);
	const parsedI = parseInsertion(insertion);
	insert(parsedB, parsedI);
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
		return { before: '', header: '', body: before, after: base.slice(start) };
	}
	const header = base.slice(start, headerEnd);

	const secondHeader = base.indexOf('\n## ', start);
	const end = secondHeader > 0 ? secondHeader + 1 : base.length;

	const body = base.slice(headerEnd, end);
	const after = base.slice(end);

	return { before, header, body, after };
}

type ParsedClause = {
	kind: string | null,
	items: ParsedItem[],
};
type ParsedItem = {
	kind: string | null,
	text: string,
};

// Compared to parseInsertion, parseBase is designed to be lossless and format error tolerant.
function parseBase(text: string): ParsedClause[] {
	const _lines = text.split('\n');
	const div1 = _lines.findIndex(line => !line.match(/^\s*$/));
	const div2 = _lines.findLastIndex(line => !line.match(/^\s*$/)) + 1;
	const leadingEmptyLines = _lines.slice(0, div1).join('\n');
	const lines = _lines.slice(div1, div2);
	const trailingEmptyLines = _lines.slice(div2).join('\n');

	const result: ParsedClause[] = [];

	for (const line of lines) {
		const lastItem = result.length > 0 ? result.at(-1)!.items.at(-1) : null;

		function newItem(kind: string | null): void {
			if (result.length === 0) result.push({ kind: null, items: [] });
			result.at(-1)!.items.push({ kind, text: line });
		}
		function continueItem(kind?: string | null): void {
			if (lastItem == null) newItem(kind ?? null);
			else if (kind === undefined) {
				if (lastItem.kind === ' ') newItem(null);
				else lastItem.text += `\n${line}`;
			}
			else if (lastItem.kind !== kind) newItem(kind);
			else lastItem.text += `\n${line}`;
		}

		if (line.startsWith('### ')) {
			result.push({ kind: line.slice(4), items: [] });
			continue;
		}
		if (line.startsWith('- ')) {
			const itemKind = line.match(/^- ([\w +-\/()]+?): /)?.[1] ?? '';
			continueItem(itemKind);
			continue;
		}
		// 空行はまとめる
		if (line.trim() === '') continueItem(' ');
		// 空行でなければ前itemの続きとみなす
		else continueItem();
	}
	result.unshift({ kind: null, items: [{ kind: ' ', text: leadingEmptyLines }] });
	result.push({ kind: null, items: [{ kind: ' ', text: trailingEmptyLines }] });
	return result;
}

type StrictParsedClause = {
	kind: string,
	items: StrictParsedItem[],
};
type StrictParsedItem = {
	kind: string,
	text: string,
};

function parseInsertion(itemsText: string): StrictParsedClause[] {
	const lines = itemsText.replaceAll(/<!--.*?-->/g, '').split('\n');
	const resultMap = new Map<string, Map<string, string>>();
	let clauseKind: null | string = null;
	let pendingItem: null | { itemKind: string, content: string } = null;

	function commitPendingItem() {
		if (pendingItem == null) return;
		if (clauseKind == null) throw new Error('clauseKind required (delayed detection): \n' + pendingItem);
		if (!resultMap.has(clauseKind)) resultMap.set(clauseKind, new Map());

		const tmp = resultMap.get(clauseKind)!;
		const itemKind = pendingItem.itemKind;
		const existingItem = tmp.get(itemKind);
		const newItem = pendingItem.content.trimEnd();
		// items of the same clauseKind and itemKind are concatenated here
		tmp.set(itemKind, existingItem ? `${existingItem}\n${newItem}` : newItem);
		pendingItem = null;
	}

	for (const [lineI, line] of lines.entries()) {
		const errmes = (mes: string) => `${mes} (at line ${lineI + 1}: \n\t${line}`;

		if (line.trim() === '') {
			if (pendingItem != null) pendingItem.content += `\n${line}`;
			continue;
		}
		if (line.startsWith('  ')) {
			if (pendingItem == null) throw new Error(errmes('invalid indent'));
			pendingItem.content += `\n${line}`;
			continue;
		}
		 
		commitPendingItem();

		if (line.startsWith('### ')) {
			clauseKind = line.slice(4);
			continue;
		}
		if (line.startsWith('- ')) {
			if (clauseKind == null) throw new Error(errmes('clauseKind required'));
			const itemKind = line.match(/^- ([\w +-\/()]+?): /)?.[1] ?? '';
			pendingItem = { content: line, itemKind };
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

// baseを改変するので注意
function insert(base: ParsedClause[], insertion: StrictParsedClause[]): void {
	const leadingEmptyLines = (base[0]?.kind === ' ') ? base.shift() : null;
	const trailingEmptyLines = (base.at(-1)?.kind === ' ') ? base.pop() : null;

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
function addClause(base: ParsedClause[], newKind: string): ParsedClause {
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

function addItem(base: ParsedItem[], newKind: string): ParsedItem {
	// すでに該当のitemがあればそれを返す
	const foundItem = base.find(v => v.kind === newKind);
	if (foundItem != null) return foundItem;

	function addAt(at: number): ParsedItem {
		const newItem = { kind: newKind, text: '' };
		base.splice(at, 0, newItem);
		return newItem;
	}

	if (base.length === 0) return addAt(0);
	if (newKind === '') return addAt(base.length);

	const pi = priorItemKinds.indexOf(newKind as any);

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
