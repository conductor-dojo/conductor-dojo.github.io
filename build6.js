/* 順位表を Artifact の db / user から Firebase（Firestore + 匿名ログイン）へ移す。

   Artifact 版は claude.ai がデータベースと本人確認を持っていたので成立していた。
   静的サイトにはどちらも無いので、Firestore を置き、匿名ログインで
   「この端末のこの人」を表す uid を配る。

   設定は firebase-config.js に置く（ビルド成果物ではないので、鍵を差し替えても再ビルド不要）。
   設定が無い／読み込めないときは、順位表は黙って畳んで通常どおり遊べる。 */
const fs = require('fs');
const P = 'index.html';
let h = fs.readFileSync(P, 'utf8');
let n = 0;
function sub(from, to) {
  if (h.indexOf(from) < 0) throw new Error('literal miss: ' + from.slice(0, 70));
  h = h.replace(from, to);
  n++;
}
function cut(from, to, next) {
  const a = h.indexOf(from), b = h.indexOf(to);
  if (a < 0 || b < 0 || b <= a) throw new Error('anchor miss: ' + from.slice(0, 55));
  h = h.slice(0, a) + next + h.slice(b);
  n++;
}

const SDK = 'https://www.gstatic.com/firebasejs/11.6.0/';

/* ---- アバターは無いので消す ---- */
sub('            <img class="lbav" id="me-av" alt="">\n', '');

/* ---- 順位表の中身を入れ替える ---- */
cut(`/* ---------- 順位表 ----------
   このArtifactを開ける人のあいだで共有される。`,
'/* ---------- テーマ ---------- */',
`/* ---------- 順位表 ----------
   Firestore に1人1件の「選手データ」を置く。誰が見ても同じ表が出る。
   本文: {uid, name, best:{hira:{seconds,misses,accuracy,kps,at}, mix:{...}, layer:{...}}, at}

   身元は匿名ログインの uid。パスワードは無く、ブラウザに紐づく。
   サイトのデータを消すと別人になる — これは仕様として画面に書いてある。
   タイムは本人のブラウザが申告するので、その気になれば詐称できる。仲間内の表として割り切る。 */
var FB=null, UID=null, capsReady=false, lbErr='';
var ME=null;
var lbCourse=COURSES[0].id;
var lbPickEl=document.getElementById('lb-pick');
var lbResEl=document.getElementById('lb-res');

async function loadMe(){
  if(!FB||!UID) return null;
  try{ return await FB.getPlayer(UID); }catch(e){ return null; }
}
async function saveMe(patch){
  if(!FB||!UID) return false;
  try{
    var body=ME?JSON.parse(JSON.stringify(ME)):(await loadMe())||{};
    if(!body.best||typeof body.best!=='object') body.best={};
    if(typeof body.name!=='string') body.name='';
    if(patch.name!==undefined) body.name=String(patch.name).slice(0,20);
    if(patch.best){ for(var k in patch.best) body.best[k]=patch.best[k]; }
    body.uid=UID;
    body.at=new Date().toISOString();
    await FB.savePlayer(body);
    ME=body;
    return true;
  }catch(e){ return false; }
}
async function lbFetch(courseId){
  if(!FB) return null;
  try{
    var docs=await FB.allPlayers();
    var rows=[];
    docs.forEach(function(v){
      var b=(v.best&&v.best[courseId])||null;
      if(!b||typeof b.seconds!=='number') return;
      rows.push({uid:(typeof v.uid==='string'?v.uid:v.__id),
                 handle:(typeof v.name==='string'?v.name:''),
                 seconds:b.seconds, misses:(typeof b.misses==='number'?b.misses:0)});
    });
    rows.sort(function(a,b){ return a.seconds-b.seconds; });
    return rows;
  }catch(e){ return null; }
}
async function lbSubmit(courseId,sec,misses,acc,kps){
  if(!FB||!UID) return 'none';
  var prev=(ME&&ME.best&&ME.best[courseId])||null;
  if(prev&&typeof prev.seconds==='number'&&prev.seconds<=sec) return 'kept';
  var one={};
  one[courseId]={seconds:Math.round(sec*10)/10,misses:misses,accuracy:acc,
                 kps:Math.round(kps*10)/10,at:new Date().toISOString()};
  var ok=await saveMe({best:one});
  return ok?(prev?'better':'first'):'none';
}
function lbMsg(el,text){
  if(!el) return;
  el.innerHTML='';
  var d=document.createElement('div'); d.className='lbmsg'; d.textContent=text;
  el.appendChild(d);
}
async function lbRender(el,courseId){
  if(!el) return null;
  if(!capsReady){ lbMsg(el,'読み込み中…'); return null; }
  if(!FB){ lbMsg(el,lbErr||'いまは順位表に繋がりません。記録はこの端末に残ります。'); return null; }
  lbMsg(el,'読み込み中…');
  var rows=await lbFetch(courseId);
  if(!rows){ lbMsg(el,'順位表を読み込めませんでした。'); return null; }
  if(!rows.length){ lbMsg(el,'このコースはまだ記録がありません。最初の一人になってください。'); return {rank:0,total:0}; }
  var myIndex=-1;
  rows.forEach(function(r,i){ if(UID&&r.uid===UID) myIndex=i; });
  var show=rows.slice(0,12);
  if(myIndex>=12) show=show.concat([rows[myIndex]]);
  el.innerHTML='';
  show.forEach(function(r){
    var i=rows.indexOf(r);
    var me=!!(UID&&r.uid===UID);
    var row=document.createElement('div');
    row.className='lbrow'+(me?' me':'')+(i<3?' top':'');
    var rank=document.createElement('span'); rank.className='lbrank'; rank.textContent=String(i+1);
    var name=document.createElement('span'); name.className='lbname';
    /* 名前は他の人の入力なので textContent で入れる */
    name.textContent=(r.handle||'名無し')+(me?'（あなた）':'');
    var sub=document.createElement('span'); sub.className='lbsub'; sub.textContent='ミス '+(r.misses||0);
    var t=document.createElement('span'); t.className='lbtime'; t.textContent=fmtTime(r.seconds||0);
    row.appendChild(rank); row.appendChild(name); row.appendChild(sub); row.appendChild(t);
    el.appendChild(row);
  });
  return {rank:myIndex>=0?myIndex+1:0,total:rows.length};
}
var meRow=document.getElementById('me-row');
var meNote=document.getElementById('me-note');
var meNameEl=document.getElementById('me-name');
var meMsgEl=document.getElementById('me-msg');
async function renderMe(){
  if(!FB||!UID){
    meRow.hidden=true;
    meNote.hidden=false;
    meNote.textContent=lbErr||'いまは順位表に繋がりません。記録はこの端末の中だけに残ります。';
    return;
  }
  ME=await loadMe();
  meRow.hidden=false;
  meNameEl.value=(ME&&ME.name)||'';
  meNameEl.placeholder='あなたの表示名';
  meNote.hidden=false;
  meNote.innerHTML='表示名を決めると順位表に名前が出ます。'+
    '<b>身元はこのブラウザに紐づきます</b> — 別の端末で開くと別人あつかいになり、'+
    'サイトのデータを消すと記録も切り離されます。ログインはありません。';
}
document.getElementById('me-save').addEventListener('click',async function(){
  var v=meNameEl.value.trim();
  meMsgEl.textContent='保存中…'; meMsgEl.style.color='var(--muted)';
  var ok=await saveMe({name:v});
  meMsgEl.textContent=ok?'保存しました':'保存できませんでした';
  meMsgEl.style.color=ok?'var(--ok)':'var(--err)';
  setTimeout(function(){ meMsgEl.textContent=''; },2200);
  if(ok) lbRender(lbPickEl,lbCourse);
});
meNameEl.addEventListener('keydown',function(e){ if(e.key==='Enter') document.getElementById('me-save').click(); });

var lbTabsEl=document.getElementById('lb-tabs');
COURSES.forEach(function(c){
  var b=document.createElement('button');
  b.type='button'; b.className='lbtab'; b.setAttribute('data-c',c.id);
  b.setAttribute('aria-pressed',String(c.id===lbCourse));
  b.innerHTML='<i>'+c.grade+'</i>'+c.name;
  b.addEventListener('click',function(){
    lbCourse=c.id;
    var ts=lbTabsEl.querySelectorAll('.lbtab');
    for(var i=0;i<ts.length;i++) ts[i].setAttribute('aria-pressed',String(ts[i].getAttribute('data-c')===lbCourse));
    lbRender(lbPickEl,lbCourse);
  });
  lbTabsEl.appendChild(b);
});

/* Firebase 側の用意ができたら受け取る。来なければ順位表なしで続ける。 */
function lbBoot(api,err){
  if(capsReady) return;
  FB=api||null;
  UID=FB?FB.uid:null;
  lbErr=err||'';
  capsReady=true;
  renderMe();
  renderCourses();
  if(!document.getElementById('g-pick').hidden) lbRender(lbPickEl,lbCourse);
}
document.addEventListener('kd-fb',function(e){
  lbBoot(e.detail&&e.detail.api,e.detail&&e.detail.err);
});
setTimeout(function(){ lbBoot(null,'順位表に繋がりませんでした（通信かブロックの可能性）。記録はこの端末の中だけに残ります。'); },12000);

`);

/* ---- 設定と Firebase 本体の読み込み ---- */
sub('</script>\n</body>', `</script>

<!-- 順位表の設定。無ければ順位表だけが畳まれる -->
<script src="firebase-config.js" onerror="this.dataset.failed=1"></script>
<script type="module">
/* Firestore へ繋いで、匿名ログインの uid を取る。
   失敗しても、その旨を渡して先に進める（ゲームは順位表なしで成立する）。 */
(async function(){
  function done(detail){ document.dispatchEvent(new CustomEvent('kd-fb',{detail:detail})); }
  var cfg=window.KD_FIREBASE;
  if(!cfg||!cfg.apiKey){
    done({api:null,err:'順位表はまだ準備中です。記録はこの端末の中だけに残ります。'});
    return;
  }
  try{
    const {initializeApp}=await import('${SDK}firebase-app.js');
    const {getAuth,signInAnonymously}=await import('${SDK}firebase-auth.js');
    const {getFirestore,doc,getDoc,setDoc,collection,getDocs,query,limit}=
      await import('${SDK}firebase-firestore.js');
    const app=initializeApp(cfg);
    const auth=getAuth(app);
    const db=getFirestore(app);
    const cred=await signInAnonymously(auth);
    const uid=cred.user.uid;
    done({api:{
      uid:uid,
      getPlayer:async function(id){
        const s=await getDoc(doc(db,'players',id));
        return s.exists()?s.data():null;
      },
      savePlayer:async function(body){
        await setDoc(doc(db,'players',uid),body);
      },
      allPlayers:async function(){
        const s=await getDocs(query(collection(db,'players'),limit(300)));
        const out=[];
        s.forEach(function(d){ out.push(Object.assign({__id:d.id},d.data())); });
        return out;
      }
    }});
  }catch(e){
    done({api:null,err:'順位表に繋がりませんでした（'+(e&&e.code?e.code:'原因不明')+'）。記録はこの端末の中だけに残ります。'});
  }
})();
</script>
</body>`);

fs.writeFileSync(P, h);
const m = h.match(/<script>([\s\S]*?)<\/script>/);
fs.writeFileSync('_check.js', m[1]);
console.log('replacements applied:', n);
