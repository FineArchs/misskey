import { describe, test, onTestFailed } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { pushChangeLog } from './push-changelog.js';

const docsDir = './docs';

type Test = [string, {
	title: string,
	base: string,
	insertion: string,
	result: string,
}];

const codePattern = (id: string, heading: string) => [
	`#### ${heading}\n`,
	'.*?',
	'^```.*?\n',
	`(?<${id}>.*?)`,
	'^```\n',
].join('');
const testPattern = new RegExp([
	'^### (?<title>.*?)\n',
	'.*?',
	codePattern('base', '追加前'),
	codePattern('insertion', 'NEW_CHANGELOGの値'),
	codePattern('result', '(追加後|エラー文)'),
].join(''), 'msg');

function parseTest(doc: string): Test[] {
	return [
		...doc.matchAll(testPattern)
	].map(m => [m.groups!.title, m.groups] as Test);
}

const dirents = await readdir(docsDir, {
	withFileTypes: true,
	recursive: true,
}).then(dirents => dirents.filter(dirent => dirent.isFile()));

for (const dirent of dirents) {
	const path = `${docsDir}/${dirent.name}`;
	const content = await readFile(path, { encoding: 'utf8' });
	const tests = parseTest(content);
	if (tests.length === 0) {
		test.skip(path);
		continue;
	}

	describe.for(tests)(`${dirent.name} > %s`, ([, { base, insertion, result }]) => {
		const isInvalid = result.startsWith('Error: ');
		if (isInvalid) {
			test('正常に失敗する', ({ expect }) => {
				onTestFailed(() => console.log({ base, insertion, result }));
				expect(
					() => pushChangeLog(base, insertion)
				// 末尾に改行が入るので除去する
				).toThrowError(new Error(result.slice(7, -1)));
			});
		} else {
			test('空文字を追加しても変化しない', ({ expect }) => {
				onTestFailed(() => console.log({ base, insertion, result }));
				expect(base).toEqual(pushChangeLog(base, ''));
				expect(result).toEqual(pushChangeLog(result, ''));
			});
			test('正常に追加される', ({ expect }) => {
				onTestFailed(() => console.log({ base, insertion, result }));
				expect(pushChangeLog(base, insertion)).toEqual(result);
			});
		};
	});
};
