/* Conductor 固有だった注記を汎用に書き換え、読み込み前は隠す。
   併せて「読み込んだ配列で打てない文字を含む語」を出題から外す。 */
const fs = require('fs');
const P = 'index.html';
let h = fs.readFileSync(P, 'utf8');
let n = 0;
function cut(from, to, next) {
  const a = h.indexOf(from), b = h.indexOf(to);
  if (a < 0 || b < 0 || b <= a) throw new Error('anchor miss: ' + from.slice(0, 55));
  h = h.slice(0, a) + next + h.slice(b);
  n++;
}
function sub(from, to) {
  if (h.indexOf(from) < 0) throw new Error('literal miss: ' + from.slice(0, 70));
  h = h.replace(from, to);
  n++;
}

/* 注記を汎用のものに差し替え、読み込み後だけ出す */
cut('  <section class="ref">', '  </section>', `  <section class="ref" id="notes" hidden>
    <div class="notes">
      <div class="note"><h4>キーキャップの色は自動で決まります</h4><p><b>オレンジ</b>＝レイヤーを出すキー（layer-tap / momentary / toggle）、<b>グレー</b>＝いちばん下の段、それ以外はアイボリー。読み込んだキーマップから機械的に振り分けています。</p></div>
      <div class="note"><h4>次のキーと、押さえるレイヤーが光ります</h4><p>塗りつぶし＝次に押すキー。太枠＝そのあいだ押さえておくレイヤーキー。Shift が要るときは<b>反対の手側</b>の Shift が光ります。</p></div>
      <div class="note"><h4>時間制限はありません</h4><p>キーキャップは右から流れてきて真ん中で止まり、打ち切るまで待ちます。落ちないので、詰まったら盤面を見て考えて大丈夫。記録は<b>全キーを書き込むまでの時間</b>です。</p></div>
      <div class="note"><h4>打ち込み窓で「届いているか」が分かる</h4><p>枠が銅色に光っていれば打鍵はこのページに届いています。灰色なら窓をクリック。日本語IMEがONだと打っても何も出ないので、そのときは直接入力へ。</p></div>
      <div class="note"><h4>日本語はローマ字で打ちます</h4><p>し＝shi / si / ci、ちゃ＝cha / tya / cya、っか＝kka / xtuka — どの流儀でも通ります。<b>配列に無い文字を含む語は出題から外します。</b></p></div>
      <div class="note"><h4>ファイルはこのブラウザの中だけ</h4><p>キーマップはどこにも送りません。記録もこの端末の中だけに残ります。</p></div>
    </div>
`);

/* 「別のキーマップ」は読み込み後だけ */
sub('<button class="reload" id="other" type="button">別のキーマップ</button>',
    '<button class="reload" id="other" type="button" hidden>別のキーマップ</button>');
sub(`  loadEl.hidden=true;
  consoleEl.hidden=false;`,
`  loadEl.hidden=true;
  consoleEl.hidden=false;
  document.getElementById('notes').hidden=false;
  document.getElementById('other').hidden=false;`);
sub(`  consoleEl.hidden=true;
  loadEl.hidden=false;
  errEl.hidden=true;`,
`  consoleEl.hidden=true;
  loadEl.hidden=false;
  document.getElementById('notes').hidden=true;
  this.hidden=true;
  errEl.hidden=true;`);

/* 読み込んだ配列で打てない語は出題しない */
sub(`function drawUnique(fn,count){
  var out=[],seen={},guard=0,it,key;
  while(out.length<count&&guard<count*50){
    guard++;
    it=fn(); key=it.ascii||it.k;
    if(seen[key]) continue;`,
`/* この配列で打ち切れる語か（PLAN に無い文字を含む語は出さない） */
function canType(it){
  var s;
  try{ s=it.ascii?it.ascii:romaFrom(makeTyper(it.k).chunks,0); }catch(e){ return false; }
  for(var i=0;i<s.length;i++){ if(!PLAN[s.charAt(i)]) return false; }
  return true;
}
function drawUnique(fn,count){
  var out=[],seen={},guard=0,it,key;
  while(out.length<count&&guard<count*50){
    guard++;
    it=fn(); key=it.ascii||it.k;
    if(seen[key]||!canType(it)) continue;`);
sub('  while(out.length<count) out.push(fn());',
`  /* それでも足りないときは、打てるものだけで埋める */
  if(out.length<count){
    var pool=[],i;
    for(i=0;i<JP_HIRA.length&&pool.length<count;i++){
      var w={d:JP_HIRA[i],k:JP_HIRA[i]};
      if(canType(w)) pool.push(w);
    }
    i=0;
    while(out.length<count&&pool.length) out.push(pool[(i++)%pool.length]);
  }`);

fs.writeFileSync(P, h);
const m = h.match(/<script>([\s\S]*)<\/script>/);
fs.writeFileSync('_check.js', m[1]);
console.log('replacements applied:', n);
