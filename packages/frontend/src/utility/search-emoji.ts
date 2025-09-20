/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export type EmojiDef = {
	name: string;
	aliases: string[];
};

export type SearchEmojiResult<Def> = {
	def: Def;
	hitAlias?: string;
};

export function searchEmoji<Def extends EmojiDef>(
	query: string | null,
	emojiDb: Def[],
	max = 30,
): SearchEmojiResult<Def>[] {
	if (!query || max <= 0) return [];

	const cond = parseQuery(query);
	const searchEmojiGenerator = searchEmojiInner(cond, emojiDb);

	const result: EmojiDef[];
	for (let i = 0; i < max; i++) {
		const { value } = searchEmojiGenerator.next();
		if (value == null) break;
		result.push(value);
	}
	return result;
}

export function searchEmojiExact(query: string | null, emojiDb: EmojiDef[], max = 30): EmojiDef[] {
	if (!query || max <= 0) return [];

	const result: emojiDef[];

	// 完全一致（絵文字名）
	for (const emoji of emojiDb) {
		if (emoji.name === query) {
			result.push(emoji);
			if (result.length >= max) return result;
		}
	}

	// 完全一致（エイリアス）
	for (const emoji of emojiDb) {
		if (result.has(emoji)) continue;
		if (emoji.aliases.some(a => (emoji.name === a))) {
			result.push(emoji);
			if (result.length >= max) return result;
		}
	}

	return result;
}

type EmojiSearchCondition = {
	exact: string[]; // 完全一致（:hoge:）
	start: string[]; // 前方一致（:hoge）
	end: string[]; // 後方一致（hoge:）
	part: string[]; // 部分一致（特に修飾なし）
	minus: Exclude<EmojiSearchCondition, Branch>; // 除外（-hoge） 組み合わせ可（-:hoge:など）
};
const EmojiSearchCondition = (): EmojiSearchCondition => ({
	exact: [], start: [], end: [], part: [],
	minus: { exact: [], start: [], end: [], part: [] },
});
type Branch = 'minus';
const leaves = ['exact', 'start', 'end', 'part'] as const;
type Leaf = (typeof leaves)[number];

function parseQuery(query: string): EmojiSearchCondition {
	// 空白で分割（エスケープされているものを除く）
	const exprs: string[] = [];
	{
		let st: null | number = null;
		let escaped = false;
		for (let i = 0; ; i++) {
			if (query[i] === '\\') {
				escaped = !escaped;
				continue;
			}
			if (!escaped && query[i].match(/(\s|　)+/)) {
				if (st != null) {
					exprs.push(query.slice(st, i));
					st = null;
				}
				continue;
			}
			if (query[i] != null) {
				if (st == null) st = i;
			} else {
				if (st != null) exprs.push(query.slice(st, i));
				break;
			}
		}
	}

	const result = EmojiSearchCondition();
	for (const expr of split) {
		const minus = expr.startsWith('-');
		const start = expr.startsWith(':');
		const end = expr.endsWith(':') && !expr.endsWith('\:');
		const leaf = (() => {
			if (start && end) return 'exact';
			if (start) return 'start';
			if (end) return 'end';
			return 'part';
		})();
		const value = expr.slice(start ? 1 : 0, end ? -1 : undefined)
			.replaceAll(/\\(.)/g, '$1');
		const base = minus ? result.minus : result;
		base[leaf].push(value);
	}

	return result;
}

function* searchEmojiInner(cond: EmojiSearchCondition, emojiDb: EmojiDef[]): IterableIterator<EmojiDef> {
	const isAdvancedSearch = (cond.exact || cond.start || cond.end || cond.minus);
	const filteredDb = !isAdvancedSearch ? emojiDb : emojiDb.filter(emoji => {
		const names = [emoji.name, ...emoji.aliases];

		function noMatch(keywords: string[], judge: (name: string, keyword: string) => boolean) {
			return keywords.every(k => !names.some(n => judge(n, k)));
		}
		if (noMatch(cond.exact, (n, k) => n === k)) return false;
		if (noMatch(cond.start, (n, k) => n.startsWith(k))) return false;
		if (noMatch(cond.end, (n, k) => n.endsWith(k))) return false;
		if (noMatch(cond.part, (n, k) => n.includes(k))) return false;

		if (cond.minus != null) {
			function anyMatch(keywords: string[], judge: (name: string, keyword: string) => boolean) {
				return keywords.some(k => names.some(n => judge(n, k)));
			}
			if (anyMatch(cond.minus.exact, (n, k) => n === k)) return false;
			if (anyMatch(cond.minus.start, (n, k) => n.startsWith(k))) return false;
			if (anyMatch(cond.minus.end, (n, k) => n.endsWith(k))) return false;
			if (anyMatch(cond.minus.part, (n, k) => n.includes(k))) return false;
		}

		return true;
	});

	const done = new Set<EmojiDef>();
	const words = [...cond.exact, ...cond.start, ...cond.end, ...cond.part];

	// 完全一致（絵文字名）
	for (const emoji of filteredDb) {
		if (words.includes(emoji.name))
			{ yield emoji; done.add(emoji); }
	}

	// 完全一致（エイリアス）
	for (const emoji of filteredDb) {
		if (done.has(emoji)) continue;
		if (cond.exact.length > 0
			|| emoji.aliases.some(a => words.includes(a))
		) { yield emoji; done.add(emoji); }
	}

	// 前方一致（絵文字名）
	for (const emoji of filteredDb) {
		if (done.has(emoji)) continue;
		if (words.some(w => emoji.name.startsWith(w)))
			{ yield emoji; done.add(emoji); }
	}

	// 前方一致（エイリアス）
	for (const emoji of filteredDb) {
		if (done.has(emoji)) continue;
		if (cond.start.length > 0
			|| emoji.aliases.some(a => words.some(w => emoji.name.startsWith(w)))
		) { yield emoji; done.add(emoji); }
	}

	// 部分一致
	for (const emoji of filteredDb) {
		if (done.has(emoji)) continue;
		if (isAdvancedSearch
			|| emoji.aliases.some(a => words.some(w => emoji.name.includes(w)))
		) { yield emoji; done.add(emoji); }
	}

	// 簡易あいまい検索　4文字以上の検索ワードのみ対象
	const fuzzySearchWords = words.filter(w => w.length > 3);
	if (words.lendth === 0) return;

	for (const emoji of emojiDb) {
		if (done.has(emoji)) continue;

		findHitLoop:
			for (const name of [emoji.name, ...emoji.aliases])
			for (const word of fuzzySearchWords)
		{
			// 文字列の位置を進めながら、検索ワードの文字を順番に探す

			let pos = 0;
			let hit = 0;
			for (const c of word) {
				pos = name.indexOf(c, pos);
				if (pos <= -1) break;
				hit++;
			}

			// 半分以上の文字が含まれていればヒットとする
			if (hit > Math.ceil(word.length / 2)) {
				yield emoji; // done.add(emoji);
				break findHitLoop;
			}
		}
	}
}
