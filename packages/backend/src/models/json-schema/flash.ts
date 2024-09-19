/*
 * SPDX-FileCopyrightText: syuilo and misskey-project
 * SPDX-License-Identifier: AGPL-3.0-only
 */

export const packedFlashSchema = {
	type: 'object',
	properties: {
		id: {
			type: 'string',
			optional: false, nullable: false,
			format: 'id',
			example: 'xxxxxxxxxx',
		},
		createdAt: {
			type: 'string',
			optional: false, nullable: false,
			format: 'date-time',
		},
		updatedAt: {
			type: 'string',
			optional: false, nullable: false,
			format: 'date-time',
		},
		userId: {
			type: 'string',
			optional: false, nullable: false,
			format: 'id',
		},
		user: {
			type: 'object',
			ref: 'UserLite',
			optional: false, nullable: false,
		},
		title: {
			type: 'string',
			optional: true, nullable: true,
		},
		summary: {
			type: 'string',
			optional: true, nullable: true,
		},
		script: {
			type: 'string',
			optional: true, nullable: true,
		},
		visibility: {
			type: 'string',
			optional: false, nullable: false,
			enum: ['private', 'urlonly', 'public'],
		},
		likedCount: {
			type: 'number',
			optional: true, nullable: true,
		},
		isLiked: {
			type: 'boolean',
			optional: true, nullable: false,
		},
		isHidden: {
			type: 'boolean',
			optional: true, nullable: false,
		},
	},
} as const;
