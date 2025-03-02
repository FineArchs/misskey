import { readFile, writeFile } from 'node:fs/promises';
import { env } from 'node:process';
import { parseArgs } from 'node:util';
import { pushChangeLog, splitByFirstRelease } from './push-changelog.js';

const opts = parseArgs({
	options: {
		path: {
			type: 'string',
			short: 'p',
			default: '../../CHANGELOG.md',
		},
		write: {
			type: 'boolean',
			short: 'w',
		},
		silent: {
			type: 'boolean',
			short: 's',
		},
	},
}).values;

const base = await readFile(opts.path, 'utf8');
const insertion = env.NEW_CHANGELOG;
if (insertion == null) throw new Error('Set NEW_CHANGELOG environment variable to run this script.');
const inserted = pushChangeLog(base, insertion);

if (!opts.silent) {
	const { header, body } = splitByFirstRelease(inserted);
	console.log(header, body);
}
if (opts.write) await writeFile(opts.path, inserted, 'utf8');
