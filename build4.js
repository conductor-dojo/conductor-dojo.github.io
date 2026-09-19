/* Artifact のHTMLは断片（doctype も <html> も meta も無い）。
   単体で配る以上、文字コード・viewport・言語を自分で名乗る必要がある。
   ファイルをそのままダウンロードして開かれても文字化けしないように。 */
const fs = require('fs');
const P = 'index.html';
let h = fs.readFileSync(P, 'utf8');

if (/^<!doctype/i.test(h.trim())) {
  console.log('already wrapped, nothing to do');
  process.exit(0);
}
if (h.indexOf('<title>') !== 0) throw new Error('expected the fragment to start with <title>');

const TITLE = 'Keymap Dojo — 自分のキーマップでタイピング練習';
const DESC = '自作キーボードのキーマップJSONを読み込んで、その配列のままタイピングを練習するサイト。'
           + 'レイヤーもコンボもそのまま。サーバー無し・ログイン無し・ファイルはブラウザの外に出ません。';

/* head に入るのは </style> まで。それ以降は body */
const cut = h.indexOf('</style>');
if (cut < 0) throw new Error('no </style> to split on');
let head = h.slice(0, cut + 8);
const body = h.slice(cut + 8).replace(/^\s*\n/, '');

head = head.replace('<title>Keymap Dojo</title>\n', '');

const out = `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="${DESC}">
<meta name="robots" content="noindex">
<meta name="color-scheme" content="light dark">
<meta property="og:type" content="website">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${DESC}">
${head}
</head>
<body>
${body}</body>
</html>
`;
fs.writeFileSync(P, out);
console.log('wrapped:', out.length, 'bytes');
