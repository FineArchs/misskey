import * as Misskey from 'misskey-js';
import { i18n } from '@/i18n.js';
import { promiseDialog } from '@/os.js';
import { misskeyApi } from '@/utility/misskey-api.js';
import { copyToClipboard } from '@/utility/copy-to-clipboard.js';
import { alert, actions } from '@/modals/simple-dialogs.js';

export type ApiWithDialogCustomErrors = Record<string, { title?: string; text: string; }>;

export const apiWithDialog = <E extends keyof Misskey.Endpoints>(
	endpoint: E,
	data: Misskey.Endpoints[E]['req'],
	token?: string | null | undefined,
	customErrors?: ApiWithDialogCustomErrors,
) => {
	const promise = misskeyApi(endpoint, data, token);
	promiseDialog(promise, null, async (err) => {
		let title: string | undefined;
		let text = err.message + '\n' + err.id;
		if (err.code === 'INTERNAL_ERROR') {
			title = i18n.ts.internalServerError;
			text = i18n.ts.internalServerErrorDescription;
			const date = new Date().toISOString();
			const { result } = await actions({
				type: 'error',
				title,
				text,
				actions: [{
					value: 'ok',
					text: i18n.ts.gotIt,
					primary: true,
				}, {
					value: 'copy',
					text: i18n.ts.copyErrorInfo,
				}],
			});
			if (result === 'copy') {
				copyToClipboard(`Endpoint: ${endpoint}\nInfo: ${JSON.stringify(err.info)}\nDate: ${date}`);
			}
			return;
		} else if (err.code === 'RATE_LIMIT_EXCEEDED') {
			title = i18n.ts.cannotPerformTemporary;
			text = i18n.ts.cannotPerformTemporaryDescription;
		} else if (err.code === 'INVALID_PARAM') {
			title = i18n.ts.invalidParamError;
			text = i18n.ts.invalidParamErrorDescription;
		} else if (err.code === 'ROLE_PERMISSION_DENIED') {
			title = i18n.ts.permissionDeniedError;
			text = i18n.ts.permissionDeniedErrorDescription;
		} else if (err.code.startsWith('TOO_MANY')) { // TODO: バックエンドに kind: client/contentsLimitExceeded みたいな感じで送るように統一してもらってそれで判定する
			title = i18n.ts.youCannotCreateAnymore;
			text = `${i18n.ts.error}: ${err.id}`;
		} else if (err.message.startsWith('Unexpected token')) {
			title = i18n.ts.gotInvalidResponseError;
			text = i18n.ts.gotInvalidResponseErrorDescription;
		} else if (customErrors && customErrors[err.id] != null) {
			title = customErrors[err.id].title;
			text = customErrors[err.id].text;
		}
		alert({
			type: 'error',
			title,
			text,
		});
	});

	return promise;
};
