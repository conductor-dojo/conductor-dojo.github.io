/* トラックボール（ポインティングデバイス）を盤面に描けるようにする。

   キーマップの JSON はキーのことしか書いていないので、ボールの位置は割り出せない。
   そこで (1) JSON に書いてあれば読む (2) 無ければ画面から置ける、の2本立てにする。
   置いた位置は localStorage のキーマップと一緒に残る。

   併せて、Conductor 専用のまま残っていた凡例の「レイヤーキー3つ」を実数に直す。 */
const fs = require('fs');
const P = 'index.html';
let h = fs.readFileSync(P, 'utf8');
let n = 0;
function sub(from, to) {
  if (h.indexOf(from) < 0) throw new Error('literal miss: ' + from.slice(0, 70));
  h = h.replace(from, to);
  n++;
}

/* ---------- CSS: 置き場スロットと、置くときのボール ---------- */
sub(`.key{
  width:var(--kw);`,
`.ball{cursor:default}
.ball.ph{outline:2px dashed var(--lc);outline-offset:2px;cursor:pointer}
.ball.ph:hover{outline-color:var(--err)}
.slot{
  width:calc(var(--kw) * .5);height:calc(var(--kw) * .92);flex:0 0 auto;
  border:1px dashed var(--lc);border-radius:3px;
  background:color-mix(in srgb,var(--lc) 24%,transparent);
  cursor:pointer;padding:0;
}
.slot:hover{background:color-mix(in srgb,var(--lc) 45%,transparent)}
.ptbtn{
  font:inherit;font-size:11.5px;font-weight:600;color:var(--on-desk);
  background:transparent;border:1px solid var(--on-desk);border-radius:999px;
  padding:2px 10px;cursor:pointer;opacity:.75;
}
.ptbtn:hover{opacity:1}
.ptbtn.on{background:var(--on-desk);color:var(--desk);opacity:1}
.legend .ptnote{font-weight:500;opacity:.8}
.key{
  width:var(--kw);`);

/* ---------- 凡例: ボール欄と、置くボタン ---------- */
sub(`      <div><i class="sw o"></i>オレンジのキーキャップ＝レイヤーキー3つ</div>
    </div>`,
`      <div id="lg-orange"><i class="sw o"></i>オレンジのキーキャップ＝レイヤーキー</div>
      <div id="lg-ball" hidden><i class="sw b"></i>トラックボール</div>
      <div><button class="ptbtn" id="ptedit" type="button">トラックボールを置く</button><span class="ptnote" id="ptnote" hidden>置きたい場所をクリック</span></div>
    </div>`);
sub('.sw.o{background:var(--cap-or);border-color:var(--cap-or-edge)}',
`.sw.o{background:var(--cap-or);border-color:var(--cap-or-edge)}
.sw.b{background:var(--ball-housing);border-color:var(--ball-housing);position:relative}
.sw.b::after{content:"";position:absolute;inset:2px 4px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#FFF,var(--ball) 58%,#CFC7B9)}`);

/* ---------- 読み込み: JSON にボールの記述があれば拾う ---------- */
sub('var KEYMAP=null, COMBOS=[], BASE=null, GEO=null, KBNAME=\'\';',
`var KEYMAP=null, COMBOS=[], BASE=null, GEO=null, KBNAME='';
/* 盤面に載る、キーではないもの。いまはトラックボールだけ。
   {side,row,after,units,label} — after はその右隣に置く位置キー（''なら行の先頭） */
var POINTERS=[];
function parsePointers(json){
  var raw=[];
  if(json&&json.pointers&&json.pointers.length) raw=json.pointers;
  else if(json&&json.trackball) raw=[json.trackball];
  var out=[];
  raw.forEach(function(p){
    if(!p) return;
    var after=p.after||p.afterKey||'';
    var side=p.side, row=p.row;
    var q=after?parsePos(after):null;
    if(q){ if(!side) side=q.side; if(row===undefined||row===null) row=q.row; }
    if(!side||row===undefined||row===null) return;
    out.push({side:side,row:+row,after:after,
              units:p.units>0?+p.units:2,
              label:p.label||'トラックボール'});
  });
  return out;
}
function pointersFor(side,row){
  return POINTERS.filter(function(p){ return p.side===side&&p.row===row; });
}
function ballEl(p){
  var d=document.createElement('div');
  d.className='ball'+(PT&&PT.edit?' ph':'');
  d.style.width='calc('+p.units+' * var(--kw) + '+(p.units-1)+' * var(--kg))';
  d.title=p.label;
  d.appendChild(document.createElement('i'));
  return d;
}`);
sub(`  GEO=buildGeo();
  LAYER_HOLD={};`,
`  GEO=buildGeo();
  POINTERS=parsePointers(json);
  LAYER_HOLD={};`);

/* ---------- 盤面: 最下段にボールを混ぜる ---------- */
sub(`    if(rr[GEO.lastRow]&&GEO.lastRow>0){
      var bot=document.createElement('div'); bot.className='bottom';
      rr[GEO.lastRow].forEach(function(k){ bot.appendChild(keyEl(lay,k.pos)); });
      plate.appendChild(bot);
    }`,
`    if(rr[GEO.lastRow]&&GEO.lastRow>0){
      var bot=document.createElement('div'); bot.className='bottom';
      var pts=pointersFor(side,GEO.lastRow);
      function ballsAfter(pos){
        pts.forEach(function(p){ if(p.after===pos) bot.appendChild(ballEl(p)); });
      }
      function slotAfter(pos){
        if(!PT.edit) return;
        var b=document.createElement('button');
        b.className='slot'; b.type='button';
        b.title='ここにトラックボールを置く';
        b.setAttribute('data-side',side); b.setAttribute('data-after',pos);
        bot.appendChild(b);
      }
      slotAfter(''); ballsAfter('');
      rr[GEO.lastRow].forEach(function(k){
        bot.appendChild(keyEl(lay,k.pos));
        ballsAfter(k.pos);
        slotAfter(k.pos);
      });
      plate.appendChild(bot);
    }`);

/* ---------- 置く・外す ---------- */
sub('/* ---------- 画面の部品 ---------- */',
`/* ---------- トラックボールを置く ---------- */
var PT={edit:false};
function ptRefresh(){
  var lg=document.getElementById('lg-ball');
  if(lg) lg.hidden=!POINTERS.length;
  var b=document.getElementById('ptedit');
  if(b) b.textContent=PT.edit?'置くのをやめる':(POINTERS.length?'トラックボールを動かす':'トラックボールを置く');
  var nt=document.getElementById('ptnote');
  if(nt) nt.hidden=!PT.edit;
}
function ptRedraw(){
  var lid=S.boardLayer;
  S.boardLayer=-99;
  setBoardLayer(lid);
  ptRefresh();
}
function ptSave(){
  if(!RAWJSON) return;
  RAWJSON.pointers=POINTERS.map(function(p){
    return {type:'trackball',side:p.side,row:p.row,after:p.after,units:p.units,label:p.label};
  });
  try{ localStorage.setItem('kd-last',JSON.stringify(RAWJSON)); }catch(e){}
}
function ptPlace(side,after){
  POINTERS=[{side:side,row:GEO.lastRow,after:after,units:2,label:'トラックボール'}];
  PT.edit=false;
  ptSave();
  ptRedraw();
}
function ptClear(){
  POINTERS=[];
  ptSave();
  ptRedraw();
}

/* ---------- 画面の部品 ---------- */`);

/* ボードのクリックを拾う（スロット＝置く、ボール＝外す） */
sub(`var boardEl=document.getElementById('board');`,
`var boardEl=document.getElementById('board');
boardEl.addEventListener('click',function(e){
  var s=e.target.closest&&e.target.closest('.slot');
  if(s){ ptPlace(s.getAttribute('data-side'),s.getAttribute('data-after')); return; }
  var b=e.target.closest&&e.target.closest('.ball');
  if(b&&PT.edit) ptClear();
});`);

fs.writeFileSync(P, h);
console.log('replacements applied:', n);

/* ---------- 続き: ボタンの配線・凡例の実数化・サンプル ---------- */
{
  let m = 0;
  function sub2(from, to) {
    if (h.indexOf(from) < 0) throw new Error('literal miss (2): ' + from.slice(0, 70));
    h = h.replace(from, to);
    m++;
  }

  /* 描き直しは盤面がまだ無いときに呼ばない */
  sub2(`function ptRedraw(){
  var lid=S.boardLayer;
  S.boardLayer=-99;
  setBoardLayer(lid);
  ptRefresh();
}`,
`function ptRedraw(){
  var lid=S.boardLayer;
  if(lid>=0){ S.boardLayer=-99; setBoardLayer(lid); }
  ptRefresh();
}`);

  /* 読み込んだ JSON を持っておく（置いた位置を書き戻すため） */
  sub2('var KEYMAP=null, COMBOS=[], BASE=null, GEO=null, KBNAME=\'\';',
       'var KEYMAP=null, COMBOS=[], BASE=null, GEO=null, KBNAME=\'\', RAWJSON=null;');
  sub2(`function startWith(json){
  try{
    loadKeymap(json);`,
`function startWith(json){
  try{
    loadKeymap(json);
    RAWJSON=json;`);

  /* 読み込み後に凡例とボタンを整える */
  sub2(`  errEl.hidden=true;
  showSpec();`,
`  errEl.hidden=true;
  showSpec();
  ptRefresh();
  (function(){
    var c=0;
    allPositions().forEach(function(p){ if(capClass(p)===' orange') c++; });
    var lg=document.getElementById('lg-orange');
    if(lg) lg.lastChild.textContent='オレンジのキーキャップ＝レイヤーキー'+c+'つ';
  })();`);

  /* ボタン */
  sub2(`document.getElementById('pickfile').addEventListener('click',function(){ fileEl.click(); });`,
`document.getElementById('ptedit').addEventListener('click',function(){
  PT.edit=!PT.edit;
  ptRedraw();
});
document.getElementById('pickfile').addEventListener('click',function(){ fileEl.click(); });`);

  /* サンプル（本人の板）には最初からボールを載せておく */
  sub2(`  startWith({name:'Conductor Monokey',layers:SAMPLE_LAYERS.map(function(L){`,
`  startWith({name:'Conductor Monokey',
    pointers:[{type:'trackball',side:'R',row:3,after:'R31',units:2,label:'トラックボール（右親指）'}],
    layers:SAMPLE_LAYERS.map(function(L){`);

  /* 注記 */
  sub2(`      <div class="note"><h4>ファイルはこのブラウザの中だけ</h4>`,
`      <div class="note"><h4>トラックボールも盤面に置けます</h4><p>キーマップの JSON はキーのことしか書いていないので、ボールの位置だけは分かりません。<b>「トラックボールを置く」</b>を押して、最下段の置きたいところをクリックしてください。もう一度押してボールをクリックすると外せます。置いた場所はこの端末に残ります。</p></div>
      <div class="note"><h4>ファイルはこのブラウザの中だけ</h4>`);

  fs.writeFileSync(P, h);
  console.log('replacements applied (2):', m);
}
