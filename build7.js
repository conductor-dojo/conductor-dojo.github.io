/* 「順位表なし」で遊べるようにする。

   切ると Firebase に**そもそも繋がない**（匿名ログインもしない）。
   記録はこの端末の中だけに残り、外へは何も出ない。
   入り切りは localStorage に覚えて、切り替えたときだけ読み直す
   （接続するかどうかはページを開いた時点で決まるので、その場では変えられない）。 */
const fs = require('fs');
const P = 'index.html';
let h = fs.readFileSync(P, 'utf8');
let n = 0;
function sub(from, to) {
  if (h.indexOf(from) < 0) throw new Error('literal miss: ' + from.slice(0, 70));
  h = h.replace(from, to);
  n++;
}

/* ---- 見出しに切り替えボタン、下に「切ってます」の一行 ---- */
sub(`            <div class="lbtabs" id="lb-tabs"></div>
          </div>`,
`            <div class="lbtabs" id="lb-tabs"></div>
            <button class="lbtoggle" id="lb-toggle" type="button">順位表を使わない</button>
          </div>
          <div class="lboff" id="lb-offnote" hidden>
            <p>いまは<b>順位表を使っていません</b>。記録はこの端末の中だけに残り、外へは何も送っていません。</p>
          </div>`);

sub('.lbtabs{display:flex;gap:4px;margin-left:auto}',
`.lbtabs{display:flex;gap:4px;margin-left:auto}
.lbtoggle{
  font:inherit;font-size:11.5px;font-weight:600;color:var(--muted);
  background:transparent;border:1px solid var(--line-2);border-radius:999px;
  padding:3px 12px;cursor:pointer;align-self:center;white-space:nowrap;
}
.lbtoggle:hover{color:var(--text);border-color:var(--text)}
.lboff{padding:10px 2px 2px}
.lboff p{margin:0;font-size:12.5px;color:var(--muted);line-height:1.7}`);

/* ---- 状態と、画面への反映 ---- */
sub(`var FB=null, UID=null, capsReady=false, lbErr='';`,
`var FB=null, UID=null, capsReady=false, lbErr='';
/* 順位表を使うか。切ってあるときは Firebase に接続すらしない。 */
var LBOFF=false;
try{ LBOFF=localStorage.getItem('kd-lboff')==='1'; }catch(e){}
function lbApplyMode(){
  var t=document.getElementById('lb-toggle');
  if(t) t.textContent=LBOFF?'順位表を使う':'順位表を使わない';
  var off=document.getElementById('lb-offnote');
  if(off) off.hidden=!LBOFF;
  var tabs=document.getElementById('lb-tabs');
  if(tabs) tabs.hidden=LBOFF;
  var pick=document.getElementById('lb-pick');
  if(pick) pick.hidden=LBOFF;
  if(LBOFF){
    var mr=document.getElementById('me-row'); if(mr) mr.hidden=true;
    var mn=document.getElementById('me-note'); if(mn) mn.hidden=true;
    var res=document.getElementById('lb-res'); if(res) res.innerHTML='';
  }
}`);

/* ---- 切ってあるときは書き込まない・読み込まない ---- */
sub(`async function lbSubmit(courseId,sec,misses,acc,kps){
  if(!FB||!UID) return 'none';`,
`async function lbSubmit(courseId,sec,misses,acc,kps){
  if(LBOFF) return 'none';
  if(!FB||!UID) return 'none';`);
sub(`async function lbRender(el,courseId){
  if(!el) return null;`,
`async function lbRender(el,courseId){
  if(!el) return null;
  if(LBOFF){ el.innerHTML=''; return null; }`);
sub(`async function renderMe(){
  if(!FB||!UID){`,
`async function renderMe(){
  if(LBOFF){ lbApplyMode(); return; }
  if(!FB||!UID){`);

/* ---- ボタン ---- */
sub(`document.addEventListener('kd-fb',function(e){`,
`document.getElementById('lb-toggle').addEventListener('click',function(){
  LBOFF=!LBOFF;
  try{ localStorage.setItem('kd-lboff',LBOFF?'1':'0'); }catch(e){}
  /* 接続するかどうかは開いた時点で決まるので、読み直して切り替える */
  location.reload();
});
lbApplyMode();
document.addEventListener('kd-fb',function(e){`);
sub(`  capsReady=true;
  renderMe();
  renderCourses();`,
`  capsReady=true;
  lbApplyMode();
  renderMe();
  renderCourses();`);

/* ---- 切ってあるときは Firebase を読み込まない ---- */
sub(`  var cfg=window.KD_FIREBASE;
  if(!cfg||!cfg.apiKey){`,
`  var off=false;
  try{ off=localStorage.getItem('kd-lboff')==='1'; }catch(e){}
  if(off){ done({api:null,err:''}); return; }
  var cfg=window.KD_FIREBASE;
  if(!cfg||!cfg.apiKey){`);

fs.writeFileSync(P, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
fs.writeFileSync('_check.js', m[1]);
console.log('replacements applied:', n);
