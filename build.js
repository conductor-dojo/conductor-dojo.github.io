/* _source.html（Conductor 専用の Artifact）から、
   任意のキーマップを読み込める汎用サイト index.html を組み立てる。 */
const fs = require('fs');
let h = fs.readFileSync('_source.html', 'utf8');
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

/* ================= 名前 ================= */
sub('<title>Conductor Monokey 道場</title>', '<title>Conductor道場</title>');
sub('<h1>Conductor <b>Monokey</b> 道場</h1>', '<h1>Conductor<b>道場</b></h1>');
sub('<div class="spec"><span>ZMK</span><span>40 KEYS</span><span>SPLIT</span><span>7 LAYERS</span><span>7 COMBOS</span></div>',
    '<div class="spec" id="spec"></div>');

/* ================= 読み込み画面 ================= */
sub('  <div class="console">', `  <div class="load" id="load">
    <h2>自分のキーマップで、タイピングを練習する。</h2>
    <p>
      キーマップの JSON を置くと、その配列のまま盤面を描いて出題します。
      <b>次に押すキーと、押さえておくレイヤーキー</b>が光るので、覚える前から打てます。
      アップロードはしません — ファイルはこのブラウザの中だけで読みます。
    </p>
    <div class="drop" id="drop">
      <b>キーマップの .json をここにドロップ</b>
      <span>または</span>
      <button class="btn pri" id="pickfile" type="button">ファイルを選ぶ</button>
      <input type="file" id="file" accept=".json,application/json" hidden>
      <span class="or">まず触ってみるなら <a href="#" id="usesample">サンプルのキーマップで試す</a></span>
    </div>
    <p class="loaderr" id="loaderr" hidden></p>
    <p class="fineprint">
      対応しているのは <b>ZMK 用キーマップエディタが書き出す JSON</b>（<code>layers[].bindings</code> を持つ形）です。
      左右分離・レイヤー・mod-tap・layer-tap を読みます。
    </p>
  </div>

  <div class="console" id="console" hidden>`);

/* ================= 読み込み画面のCSS ================= */
sub('/* ---------- 自分の欄 ---------- */', `/* ---------- 読み込み画面 ---------- */
.load{padding:34px 0 40px;max-width:640px;margin:0 auto;text-align:center}
.load h2{font-size:clamp(19px,3.4vw,27px);font-weight:800;font-stretch:88%;letter-spacing:-.02em;line-height:1.35}
.load p{margin:14px 0 0;font-size:13.5px;color:var(--muted);line-height:1.75;text-align:left}
.load p b{color:var(--text)}
.drop{
  margin-top:22px;border:2px dashed var(--line-2);border-radius:10px;
  padding:26px 18px;display:flex;flex-direction:column;align-items:center;gap:10px;
  background:var(--surface);transition:border-color .15s,background .15s;
}
.drop.over{border-color:var(--copper);background:color-mix(in srgb,var(--copper) 8%,var(--surface))}
.drop > b{font-size:14px;font-weight:800}
.drop > span{font-size:12px;color:var(--muted)}
.drop .or{margin-top:6px}
.drop .or a{color:var(--copper);font-weight:700}
.loaderr{color:var(--err)!important;font-weight:700;text-align:center!important}
.fineprint{font-size:12px!important;line-height:1.7!important}
.fineprint code{font-family:"IBM Plex Mono",monospace;font-size:11.5px;background:var(--surface-2);
  border:1px solid var(--line);border-radius:3px;padding:0 4px;color:var(--text)}
.half.c .plate{align-items:center}
.reload{
  cursor:pointer;font-family:inherit;font-size:12px;font-weight:700;white-space:nowrap;
  border:1px solid var(--line);border-radius:4px;padding:5px 11px;background:var(--surface);color:var(--text);
}
.reload:hover{border-color:var(--copper);color:var(--copper)}

/* ---------- 自分の欄 ---------- */`);

/* ================= キーマップの保持 ================= */
sub('const KEYMAP=[', 'var SAMPLE_LAYERS=[');
sub('const COMBOS=[', 'var SAMPLE_COMBOS=[');

/* ================= 物理配置を汎用化 ================= */
cut('/* ---------- 物理配置 ---------- */', '/* ---------- キーコード → 文字 ---------- */', `/* ---------- 物理配置（読み込んだキーマップから組み立てる） ----------
   位置キーは "L00" "R23" のように <側><行><列>。行・列・左右をここから割り出すので、
   キー数や列数が違う板でも同じコードで描ける。 */
var KEYMAP=null, COMBOS=[], BASE=null, GEO=null, KBNAME='';
var LAYER_HOLD={}, SHIFT_POS={left:null,right:null};
var PLAN={};

function layerById(id){
  if(!KEYMAP) return null;
  for(var i=0;i<KEYMAP.length;i++){ if(KEYMAP[i].id===id) return KEYMAP[i]; }
  return null;
}
function parsePos(p){
  var m=/^([A-Za-z]+)(\\d)(\\d+)$/.exec(p);
  return m?{side:m[1],row:+m[2],col:+m[3]}:null;
}
function buildGeo(){
  var sides={}, order=[], maxRow=0;
  Object.keys(BASE).forEach(function(p){
    var q=parsePos(p); if(!q) return;
    if(!sides[q.side]){ sides[q.side]={rows:{},cols:0}; order.push(q.side); }
    var rr=sides[q.side].rows;
    if(!rr[q.row]) rr[q.row]=[];
    rr[q.row].push({pos:p,col:q.col});
    if(q.row>maxRow) maxRow=q.row;
  });
  if(!order.length) throw new Error('キーの位置を読み取れませんでした');
  order.sort();
  order.forEach(function(s){
    var rr=sides[s].rows, c=0;
    Object.keys(rr).forEach(function(r){
      rr[r].sort(function(a,b){ return a.col-b.col; });
      if(+r<maxRow) c=Math.max(c,rr[r].length);
    });
    sides[s].cols=c||rr[maxRow].length;
  });
  return {sides:sides,order:order,lastRow:maxRow};
}
function allPositions(){
  var out=[];
  GEO.order.forEach(function(s){
    var rr=GEO.sides[s].rows;
    Object.keys(rr).sort().forEach(function(r){ rr[r].forEach(function(k){ out.push(k.pos); }); });
  });
  return out;
}
/* キーキャップの色: レイヤーを出すキー=オレンジ／最下段=グレー／ほかはアイボリー */
function capClass(pos){
  var b=BASE[pos];
  if(b&&(b.t==='layer-tap'||b.t==='momentary'||b.t==='toggle')) return ' orange';
  var q=parsePos(pos);
  if(q&&q.row===GEO.lastRow) return ' grey';
  return '';
}
var FING=['小指','薬指','中指','人差し指','人差し指（内）'];
function fingerOf(pos){
  var q=parsePos(pos); if(!q||!GEO) return '';
  var many=GEO.order.length>1;
  var hand=many?((q.side===GEO.order[GEO.order.length-1])?'右手':'左手'):'';
  if(q.row===GEO.lastRow){
    var b=BASE[pos];
    var thumb=b&&(b.t==='layer-tap'||b.t==='mod-tap');
    return (hand?hand+' ':'')+(thumb?'親指':'下段');
  }
  var cols=GEO.sides[q.side].cols;
  var idx=(hand==='右手')?(cols-1-q.col):q.col;
  if(idx<0) idx=0;
  return (hand?hand+' ':'')+FING[Math.min(idx,FING.length-1)];
}

`);

/* ================= PLAN をキーマップ読み込み時に組む ================= */
cut('/* レイヤー呼び出しキーを base から拾う */', '/* ---------- ローマ字入力エンジン ---------- */', `function buildPlan(){
  PLAN={};
  function add(ch,plan){ if(ch&&!PLAN[ch]) PLAN[ch]=plan; }
  var ids=[0];
  Object.keys(LAYER_HOLD).forEach(function(k){ if(+k!==0) ids.push(+k); });
  ids.forEach(function(lid){
    var lay=layerById(lid); if(!lay) return;
    Object.keys(lay.b).forEach(function(pos){
      var b=lay.b[pos];
      var ch=CHAR_OF[b.a||b.c];
      if(ch===undefined) return;
      add(ch,{layer:lid,pos:pos,shift:false});
    });
  });
  Object.keys(PLAN).slice().forEach(function(ch){
    var up=SHIFTED[ch]; if(!up) return;
    var p=PLAN[ch];
    add(up,{layer:p.layer,pos:p.pos,shift:true});
  });
}
/* キーマップを1つ読み込んで、盤面・指・打ち方の表を全部組み直す */
function loadKeymap(json){
  var layers=json&&json.layers;
  if(!layers||!layers.length) throw new Error('layers が見つかりません');
  KEYMAP=layers.map(function(L,i){
    var b=L.bindings||L.b||{};
    var nb={};
    Object.keys(b).forEach(function(p){
      var v=b[p]||{};
      nb[p]={l:(v.label!==undefined?v.label:v.l)||'',
             c:(v.keyCode!==undefined?v.keyCode:v.c)||'',
             t:(v.type!==undefined?v.type:v.t)||'basic',
             h:(v.holdAction!==undefined?v.holdAction:v.h),
             a:(v.tapAction!==undefined?v.tapAction:v.a)};
    });
    return {id:(L.id!==undefined?L.id:i),name:L.name||('Layer '+i),color:L.color||'#B87333',b:nb};
  });
  COMBOS=(json.combos||[]).map(function(c){
    return {n:c.name||'',k:c.keyPositions||c.k||[],
            l:(c.binding&&c.binding.label)||c.l||'',c:(c.binding&&c.binding.keyCode)||c.c||''};
  });
  KBNAME=json.name||json.keyboard||'';
  var base=layerById(0)||KEYMAP[0];
  BASE=base.b;
  if(!Object.keys(BASE).length) throw new Error('base レイヤーが空です');
  GEO=buildGeo();
  LAYER_HOLD={};
  Object.keys(BASE).forEach(function(pos){
    var b=BASE[pos];
    if(b.t==='layer-tap'&&b.h){ var m=/(\\d+)/.exec(b.h); if(m) LAYER_HOLD[+m[1]]=pos; }
  });
  SHIFT_POS={left:null,right:null};
  Object.keys(BASE).forEach(function(pos){
    var b=BASE[pos];
    if(b.t!=='mod-tap'||!b.h) return;
    if(/LSHIFT|LSFT/i.test(b.h)) SHIFT_POS.left=pos;
    if(/RSHIFT|RSFT/i.test(b.h)) SHIFT_POS.right=pos;
  });
  if(!SHIFT_POS.left&&SHIFT_POS.right) SHIFT_POS.left=SHIFT_POS.right;
  if(!SHIFT_POS.right&&SHIFT_POS.left) SHIFT_POS.right=SHIFT_POS.left;
  buildPlan();
  if(!PLAN['a']||!PLAN['e']) throw new Error('英字キーが見つかりません。base レイヤーのあるキーマップを選んでください');
}

`);

/* ================= 盤面の描画を汎用化 ================= */
cut('function keyEl(lay,pos){', '/* ---------- 画面の部品 ---------- */', `function keyEl(lay,pos){
  var d=document.createElement('div');
  d.className='key'+capClass(pos);
  d.setAttribute('data-pos',pos);
  var info=labelFor(lay,pos);
  if(info.cls) d.className+=' '+info.cls;
  var s=document.createElement('span');
  if(info.text.length>4) s.className='sm';
  s.textContent=info.text;
  d.appendChild(s);
  var b=lay.b[pos];
  if(b&&b.c&&b.t!=='none') d.title=pos+'  '+b.c;
  return d;
}
function buildBoard(el,lay){
  el.innerHTML='';
  GEO.order.forEach(function(side,si){
    var half=document.createElement('div');
    half.className='half '+(GEO.order.length<2?'c':(si===0?'l':'r'));
    var plate=document.createElement('div'); plate.className='plate';
    var dots=document.createElement('div'); dots.className='dots';
    dots.appendChild(document.createElement('i')); dots.appendChild(document.createElement('i'));
    plate.appendChild(dots);
    var rr=GEO.sides[side].rows;
    var alpha=document.createElement('div'); alpha.className='alpha';
    alpha.style.gridTemplateColumns='repeat('+GEO.sides[side].cols+',var(--kw))';
    for(var r=0;r<GEO.lastRow;r++){
      (rr[r]||[]).forEach(function(k){ alpha.appendChild(keyEl(lay,k.pos)); });
    }
    plate.appendChild(alpha);
    if(rr[GEO.lastRow]&&GEO.lastRow>0){
      var bot=document.createElement('div'); bot.className='bottom';
      rr[GEO.lastRow].forEach(function(k){ bot.appendChild(keyEl(lay,k.pos)); });
      plate.appendChild(bot);
    }
    half.appendChild(plate);
    el.appendChild(half);
  });
}

`);

/* ================= キー位置は読み込み後に決まる ================= */
sub(`var ALL_POS=(function(){
  var a=[],r,c;
  for(r=0;r<3;r++) for(c=0;c<5;c++) a.push('L'+r+c);
  THUMB_L.forEach(function(p){a.push(p);});
  for(r=0;r<3;r++) for(c=0;c<5;c++) a.push('R'+r+c);
  THUMB_R.forEach(function(p){a.push(p);});
  return a;
})();`, '');
sub('  var pos=shuffled(ALL_POS),out=[],i;', '  var pos=shuffled(allPositions()),out=[],i;');
sub('  for(i=0;i<40;i++){\n    var it=items[i];', '  for(i=0;i<pos.length;i++){\n    var it=items[i];');
sub('  var items=drawUnique(c.pool,40);', '  var items=drawUnique(c.pool,pos.length);');

/* 「40キー」は板によって変わる */
sub("document.getElementById('gv-done').innerHTML=G.wrote+'<u> / 40 キー</u>';",
    "document.getElementById('gv-done').innerHTML=G.wrote+'<u> / '+G.plates.length+' キー</u>';");
sub('<span class="val" id="gv-done">0<u> / 40 キー</u></span>', '<span class="val" id="gv-done">0<u> / -- キー</u></span>');
sub("  var r=G.wrote/40;", "  var r=G.plates.length?G.wrote/G.plates.length:0;");



sub("textContent='で 40キー 書き込み完了';", "textContent='で '+G.plates.length+'キー 書き込み完了';");
sub("textContent='で 40キー 書き込み完了 — ベスト更新';", "textContent='で '+G.plates.length+'キー 書き込み完了 — ベスト更新';");
sub('<span id="gr-word">で 40キー 書き込み完了</span>', '<span id="gr-word"></span>');

fs.writeFileSync('index.html', h);
console.log('replacements applied:', n);
