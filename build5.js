/* トラックボールを盤面に描く。

   物理的なキー配置はどの板も同じ前提（Conductor Monokey）なので、ボールは
   最初から決まった場所に描く。置き場を選ばせる UI は持たない。
   キーマップの JSON に pointers があればそちらを優先する（板が違うときの逃げ道）。

   併せて、Conductor 決め打ちのまま残っていた凡例の「レイヤーキー3つ」を実数に直す。 */
const fs = require('fs');
const P = 'index.html';
let h = fs.readFileSync(P, 'utf8');
let n = 0;
function sub(from, to) {
  if (h.indexOf(from) < 0) throw new Error('literal miss: ' + from.slice(0, 70));
  h = h.replace(from, to);
  n++;
}

/* ---------- 凡例にボール欄 ---------- */
sub(`      <div><i class="sw o"></i>オレンジのキーキャップ＝レイヤーキー3つ</div>
    </div>`,
`      <div id="lg-orange"><i class="sw o"></i>オレンジのキーキャップ＝レイヤーキー</div>
      <div><i class="sw b"></i>トラックボール（右親指）</div>
    </div>`);
sub('.sw.o{background:var(--cap-or);border-color:var(--cap-or-edge)}',
`.sw.o{background:var(--cap-or);border-color:var(--cap-or-edge)}
.sw.b{background:var(--ball-housing);border-color:var(--ball-housing);position:relative}
.sw.b::after{content:"";position:absolute;inset:2px 4px;border-radius:50%;background:radial-gradient(circle at 34% 30%,#FFF,var(--ball) 58%,#CFC7B9)}`);

/* ---------- 盤面に載る、キーではないもの ---------- */
sub('var KEYMAP=null, COMBOS=[], BASE=null, GEO=null, KBNAME=\'\';',
`var KEYMAP=null, COMBOS=[], BASE=null, GEO=null, KBNAME='';

/* 物理配置は共通なので、ボールの位置は決め打ちでよい。
   after = そのキーの右隣に置く（見つからなければ行の末尾）。 */
var BUILT_IN_POINTERS=[{side:'R',after:'R31',units:2,label:'トラックボール（右親指）'}];
var POINTERS=[];
function parsePointers(json){
  var raw=null;
  if(json&&json.pointers&&json.pointers.length) raw=json.pointers;
  else if(json&&json.trackball) raw=[json.trackball];
  if(!raw) return BUILT_IN_POINTERS.slice();
  var out=[];
  raw.forEach(function(p){
    if(!p) return;
    var after=p.after||p.afterKey||'';
    var side=p.side||(after?(parsePos(after)||{}).side:null);
    if(!side) return;
    out.push({side:side,after:after,
              units:p.units>0?+p.units:2,
              label:p.label||'トラックボール'});
  });
  return out;
}
function ballEl(p){
  var d=document.createElement('div');
  d.className='ball';
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

/* ---------- 最下段にボールを混ぜる ---------- */
sub(`    if(rr[GEO.lastRow]&&GEO.lastRow>0){
      var bot=document.createElement('div'); bot.className='bottom';
      rr[GEO.lastRow].forEach(function(k){ bot.appendChild(keyEl(lay,k.pos)); });
      plate.appendChild(bot);
    }`,
`    if(rr[GEO.lastRow]&&GEO.lastRow>0){
      var bot=document.createElement('div'); bot.className='bottom';
      var pts=POINTERS.filter(function(p){ return p.side===side; });
      var left=pts.slice();
      var ballsAfter=function(pos){
        pts.forEach(function(p){
          if(p.after!==pos) return;
          bot.appendChild(ballEl(p));
          var i=left.indexOf(p); if(i>=0) left.splice(i,1);
        });
      };
      ballsAfter('');
      rr[GEO.lastRow].forEach(function(k){
        bot.appendChild(keyEl(lay,k.pos));
        ballsAfter(k.pos);
      });
      /* 置き場のキーが無い板では行の末尾へ */
      left.forEach(function(p){ bot.appendChild(ballEl(p)); });
      plate.appendChild(bot);
    }`);

/* ---------- 凡例のレイヤーキー数を実数にする ---------- */
sub(`  errEl.hidden=true;
  showSpec();`,
`  errEl.hidden=true;
  showSpec();
  (function(){
    var c=0;
    allPositions().forEach(function(p){ if(capClass(p)===' orange') c++; });
    var lg=document.getElementById('lg-orange');
    if(lg) lg.lastChild.textContent='オレンジのキーキャップ＝レイヤーキー'+c+'つ';
  })();`);

/* ---------- 注記 ---------- */
sub(`      <div class="note"><h4>ファイルはこのブラウザの中だけ</h4>`,
`      <div class="note"><h4>右親指の先はトラックボール</h4><p>右手の下段は <code>Enter</code> <code>かな</code> の次がボール。<code>Bksp</code> <code>Del</code> はその向こう側なので、下段が左右で 6キー / 4キー と非対称になっています。<b>盤面の形はどの板も同じ前提</b>で、キーの中身だけをキーマップから読んでいます。</p></div>
      <div class="note"><h4>ファイルはこのブラウザの中だけ</h4>`);

fs.writeFileSync(P, h);
console.log('replacements applied:', n);
