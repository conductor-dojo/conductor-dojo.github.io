/* index.html に、キーマップ読み込みの配線を足し、Artifact 専用だった
   アカウント／順位表（db・user ケイパビリティ）を外す。 */
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

/* ---- 順位表・自分の欄のHTMLを外す ---- */
cut('        <div class="lbwrap">', '      </div>\n\n      <div id="g-play"', '');
sub(`        <div class="myrank" id="gr-myrank" hidden></div>
        <div class="lb" id="lb-res"></div>
`, '');

/* ---- ヘッダに「別のキーマップ」ボタン ---- */
sub('<button class="themebtn" id="theme" type="button">THEME</button>',
    '<button class="reload" id="other" type="button">別のキーマップ</button>\n    <button class="themebtn" id="theme" type="button">THEME</button>');

/* ---- 順位表・自分の欄のCSSを外す（同名の見出しがJS側にもあるので、CSSは範囲で消す） ---- */
cut('/* ---------- 自分の欄 ---------- */', '/* ---------- コース選択 ---------- */', '');

/* ---- 順位表のJSを外す（JS側の見出しは2行目まで含めて一意にする） ---- */
cut('/* ---------- 順位表 ----------\n   このArtifactを開ける人のあいだで共有される。', '/* ---------- テーマ ---------- */', '');
cut('  var myEl=document.getElementById(\'gr-myrank\');', '})(G.c.id,el,G.miss,acc,kps);', '');
sub("})(G.c.id,el,G.miss,acc,kps);\n", '');
sub("  lbRender(lbPickEl,lbCourse);\n", '');

/* ---- 起動をキーマップ読み込み待ちに ---- */
sub('\nshowPick();', `
/* ---------- キーマップの読み込み ---------- */
var loadEl=document.getElementById('load');
var consoleEl=document.getElementById('console');
var dropEl=document.getElementById('drop');
var fileEl=document.getElementById('file');
var errEl=document.getElementById('loaderr');

function loadErr(msg){
  errEl.hidden=false;
  errEl.textContent=msg;
}
function showSpec(){
  var spec=document.getElementById('spec');
  var layers=KEYMAP.filter(function(L){
    return Object.keys(L.b).some(function(p){ var b=L.b[p]; return b.t!=='none'&&b.t!=='transparent'; });
  }).length;
  var bits=[];
  if(KBNAME) bits.push(KBNAME);
  bits.push(allPositions().length+' KEYS');
  if(GEO.order.length>1) bits.push('SPLIT');
  bits.push(layers+' LAYERS');
  if(COMBOS.length) bits.push(COMBOS.length+' COMBOS');
  spec.innerHTML='';
  bits.forEach(function(t){ var s=document.createElement('span'); s.textContent=t; spec.appendChild(s); });
}
function startWith(json){
  try{
    loadKeymap(json);
  }catch(e){
    loadErr('このファイルは読めませんでした — '+(e&&e.message?e.message:'形式が違うようです'));
    return;
  }
  errEl.hidden=true;
  showSpec();
  loadEl.hidden=true;
  consoleEl.hidden=false;
  S.boardLayer=-1;
  showPick();
  try{ localStorage.setItem('kd-last',JSON.stringify(json)); }catch(e){}
}
function readFile(f){
  if(!f) return;
  if(f.size>4*1024*1024){ loadErr('ファイルが大きすぎます（4MBまで）'); return; }
  var fr=new FileReader();
  fr.onload=function(){
    var json;
    try{ json=JSON.parse(fr.result); }
    catch(e){ loadErr('JSON として読めませんでした'); return; }
    startWith(json);
  };
  fr.onerror=function(){ loadErr('ファイルを読み込めませんでした'); };
  fr.readAsText(f);
}
document.getElementById('pickfile').addEventListener('click',function(){ fileEl.click(); });
fileEl.addEventListener('change',function(){ readFile(fileEl.files&&fileEl.files[0]); });
document.getElementById('usesample').addEventListener('click',function(e){
  e.preventDefault();
  startWith({name:'Conductor Monokey',layers:SAMPLE_LAYERS.map(function(L){
    return {id:L.id,name:L.name,color:L.color,bindings:L.b};
  }),combos:SAMPLE_COMBOS.map(function(c){
    return {name:c.n,keyPositions:c.k,binding:{label:c.l,keyCode:c.c}};
  })});
});
['dragenter','dragover'].forEach(function(t){
  dropEl.addEventListener(t,function(e){ e.preventDefault(); dropEl.classList.add('over'); });
});
['dragleave','drop'].forEach(function(t){
  dropEl.addEventListener(t,function(e){ e.preventDefault(); dropEl.classList.remove('over'); });
});
dropEl.addEventListener('drop',function(e){
  var f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];
  readFile(f);
});
/* ページ全体でも受ける */
['dragover','drop'].forEach(function(t){
  document.addEventListener(t,function(e){ e.preventDefault(); });
});
document.getElementById('other').addEventListener('click',function(){
  stopGame();
  consoleEl.hidden=true;
  loadEl.hidden=false;
  errEl.hidden=true;
  try{ localStorage.removeItem('kd-last'); }catch(e){}
});
/* 前回のキーマップがあれば黙って戻す */
(function(){
  var saved=null;
  try{ saved=JSON.parse(localStorage.getItem('kd-last')); }catch(e){}
  if(saved) startWith(saved);
})();`);

fs.writeFileSync(P, h);
const m = h.match(/<script>([\s\S]*)<\/script>/);
fs.writeFileSync('_check.js', m[1]);
console.log('replacements applied:', n);

/* ---- 皿のキーキャップも capClass() に合わせる ---- */
{
  const a = "  cap.className='pcap'+(GREY_CAPS[p.pos]?' t1':'')+(ORANGE_CAPS[p.pos]?' t2':'');";
  const b = "  var cc=capClass(p.pos);\n  cap.className='pcap'+(cc===' grey'?' t1':'')+(cc===' orange'?' t2':'');";
  if (h.indexOf(a) < 0) throw new Error('cap anchor miss');
  h = h.replace(a, b);
  fs.writeFileSync(P, h);
  const mm = h.match(/<script>([\s\S]*)<\/script>/);
  fs.writeFileSync('_check.js', mm[1]);
  console.log('dish cap fixed');
}
