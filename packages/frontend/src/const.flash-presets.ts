import { AISCRIPT_VERSION } from '@syuilo/aiscript';

export const PRESET_DEFAULT = `/// @ ${AISCRIPT_VERSION}

var name = ""

Ui:render([
	Ui:C:textInput({
		label: "Your name"
		onInput: @(v) { name = v }
	})
	Ui:C:button({
		text: "Hello"
		onClick: @() {
			Mk:dialog(null, \`Hello, {name}!\`)
		}
	})
])
`;

const PRESET_OMIKUJI = `/// @ ${AISCRIPT_VERSION}
// ユーザーごとに日替わりのおみくじのプリセット

// 選択肢
let choices = [
	"ｷﾞｶﾞ吉"
	"大吉"
	"吉"
	"中吉"
	"小吉"
	"末吉"
	"凶"
	"大凶"
]

// シードが「PlayID+ユーザーID+今日の日付」である乱数生成器を用意
let random = Math:gen_rng(\`{THIS_ID}{USER_ID}{Date:year()}{Date:month()}{Date:day()}\`)

// ランダムに選択肢を選ぶ
let chosen = choices[random(0, (choices.len - 1))]

// 結果のテキスト
let result = \`今日のあなたの運勢は **{chosen}** です。\`

// UIを表示
Ui:render([
	Ui:C:container({
		align: 'center'
		children: [
			Ui:C:mfm({ text: result })
			Ui:C:postFormButton({
				text: "投稿する"
				rounded: true
				primary: true
				form: {
					text: \`{result}{Str:lf}{THIS_URL}\`
				}
			})
		]
	})
])
`;

const PRESET_SHUFFLE = `/// @ ${AISCRIPT_VERSION}
// 巻き戻し可能な文字シャッフルのプリセット

let string = "ペペロンチーノ"
let length = string.len

// 過去の結果を保存しておくやつ
var results = []

// どれだけ巻き戻しているか
var cursor = 0

@do() {
	if (cursor != 0) {
		results = results.slice(0, (cursor + 1))
		cursor = 0
	}

	let chars = []
	for (let i, length) {
		let r = Math:rnd(0, (length - 1))
		chars.push(string.pick(r))
	}
	let result = chars.join("")

	results.push(result)

	// UIを表示
	render(result)
}

@back() {
	cursor = cursor + 1
	let result = results[results.len - (cursor + 1)]
	render(result)
}

@forward() {
	cursor = cursor - 1
	let result = results[results.len - (cursor + 1)]
	render(result)
}

@render(result) {
	Ui:render([
		Ui:C:container({
			align: 'center'
			children: [
				Ui:C:mfm({ text: result })
				Ui:C:buttons({
					buttons: [{
						text: "←"
						disabled: !(results.len > 1 && (results.len - cursor) > 1)
						onClick: back
					}, {
						text: "→"
						disabled: !(results.len > 1 && cursor > 0)
						onClick: forward
					}, {
						text: "引き直す"
						onClick: do
					}]
				})
				Ui:C:postFormButton({
					text: "投稿する"
					rounded: true
					primary: true
					form: {
						text: \`{result}{Str:lf}{THIS_URL}\`
					}
				})
			]
		})
	])
}

do()
`;

const PRESET_QUIZ = `/// @ ${AISCRIPT_VERSION}
let title = '地理クイズ'

let qas = [{
	q: 'オーストラリアの首都は？'
	choices: ['シドニー', 'キャンベラ', 'メルボルン']
	a: 'キャンベラ'
	aDescription: '最大の都市はシドニーですが首都はキャンベラです。'
}, {
	q: '国土面積2番目の国は？'
	choices: ['カナダ', 'アメリカ', '中国']
	a: 'カナダ'
	aDescription: '大きい順にロシア、カナダ、アメリカ、中国です。'
}, {
	q: '二重内陸国ではないのは？'
	choices: ['リヒテンシュタイン', 'ウズベキスタン', 'レソト']
	a: 'レソト'
	aDescription: 'レソトは(一重)内陸国です。'
}, {
	q: '閘門がない運河は？'
	choices: ['キール運河', 'スエズ運河', 'パナマ運河']
	a: 'スエズ運河'
	aDescription: 'スエズ運河は高低差がないので閘門はありません。'
}]

let qaEls = [Ui:C:container({
	align: 'center'
	children: [
		Ui:C:text({
			size: 1.5
			bold: true
			text: title
		})
	]
})]

var qn = 0
each (let qa, qas) {
	qn += 1
	qa.id = Util:uuid()
	qaEls.push(Ui:C:container({
		align: 'center'
		bgColor: '#000'
		fgColor: '#fff'
		padding: 16
		rounded: true
		children: [
			Ui:C:text({
				text: \`Q{qn} {qa.q}\`
			})
			Ui:C:select({
				items: qa.choices.map(@(c) {{ text: c, value: c }})
				onChange: @(v) { qa.userAnswer = v }
			})
			Ui:C:container({
				children: []
			}, \`{qa.id}:a\`)
		]
	}, qa.id))
}

@finish() {
	var score = 0

	each (let qa, qas) {
		let correct = qa.userAnswer == qa.a
		if (correct) score += 1
		let el = Ui:get(\`{qa.id}:a\`)
		el.update({
			children: [
				Ui:C:text({
					size: 1.2
					bold: true
					color: if (correct) '#f00' else '#00f'
					text: if (correct) '🎉正解' else '不正解'
				})
				Ui:C:text({
					text: qa.aDescription
				})
			]
		})
	}

	let result = \`{title}の結果は{qas.len}問中{score}問正解でした。\`
	Ui:get('footer').update({
		children: [
			Ui:C:postFormButton({
				text: '結果を共有'
				rounded: true
				primary: true
				form: {
					text: \`{result}{Str:lf}{THIS_URL}\`
				}
			})
		]
	})
}

qaEls.push(Ui:C:container({
	align: 'center'
	children: [
		Ui:C:button({
			text: '答え合わせ'
			primary: true
			rounded: true
			onClick: finish
		})
	]
}, 'footer'))

Ui:render(qaEls)
`;

const PRESET_TIMELINE = `/// @ ${AISCRIPT_VERSION}
// APIリクエストを行いローカルタイムラインを表示するプリセット

@fetch() {
	Ui:render([
		Ui:C:container({
			align: 'center'
			children: [
				Ui:C:text({ text: "読み込み中..." })
			]
		})
	])

	// タイムライン取得
	let notes = Mk:api("notes/local-timeline", {})

	// それぞれのノートごとにUI要素作成
	let noteEls = []
	each (let note, notes) {
		// 表示名を設定していないアカウントはidを表示
		let userName = if Core:type(note.user.name) == "str" note.user.name else note.user.username
		// リノートもしくはメディア・投票のみで本文が無いノートに代替表示文を設定
		let noteText = if Core:type(note.text) == "str" note.text else "（リノートもしくはメディア・投票のみのノート）"

		let el = Ui:C:container({
			bgColor: "#444"
			fgColor: "#fff"
			padding: 10
			rounded: true
			children: [
				Ui:C:mfm({
					text: userName
					bold: true
				})
				Ui:C:mfm({
					text: noteText
				})
			]
		})
		noteEls.push(el)
	}

	// UIを表示
	Ui:render([
		Ui:C:text({ text: "ローカル タイムライン" })
		Ui:C:button({
			text: "更新"
			onClick: @() {
				fetch()
			}
		})
		Ui:C:container({
			children: noteEls
		})
	])
}

fetch()
`;

export const PRESET_SELECTIONS = [
	{
		title: 'Omikuji',
		script: PRESET_OMIKUJI,
	}, {
		title: 'Shuffle',
		script: PRESET_SHUFFLE,
	}, {
		title: 'Quiz',
		script: PRESET_QUIZ,
	}, {
		title: 'Timeline viewer',
		script: PRESET_TIMELINE,
	},
];
