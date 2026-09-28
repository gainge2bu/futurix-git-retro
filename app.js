(function(){
"use strict";

/* ============================================================
   퓨처릭스 일잘법 GIT 회고
   - firebase-config.js 에 설정이 있으면: Firestore로 실시간 공유
   - 없으면: 이 브라우저(localStorage)에만 저장
   - 주소 뒤 #방이름 으로 회고방을 나눌 수 있음 (예: .../#홀서비스팀)
   ============================================================ */

const CFG = (window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey) ? window.FIREBASE_CONFIG : null;
const FB_VER = "10.12.2";
const ROOM = (() => { let r = ""; try { r = decodeURIComponent(location.hash.slice(1)); } catch (e) {} return /^[\p{L}\p{N}_-]{1,40}$/u.test(r) ? r : "main"; })();
window.addEventListener("hashchange", () => location.reload());

/* ---------- 회고 대상: 일하는 9가지 방법 ---------- */
const MOTTO = "목적은 함께 정하고, 기준은 함께 지키며, 방법은 스스로 선택한다.";
const CATS = [
  {k:"A", name:"Attitude",   ko:"주도적으로 다가가고, 묻고, 행동한다",   hs:[1,2,3]},
  {k:"I", name:"Integrity",  ko:"사실을 숨기지 않고, 약속과 기준을 지킨다", hs:[4,5,6]},
  {k:"X", name:"eXtra-Mile", ko:"현장에서 확인하고, 끝내고, 표준화한다",   hs:[7,8,9]}
];
const HABITS = {
  1:"먼저 다가가고, 필요한 일을 먼저 찾는다.",
  2:"5초의 질문이 5일의 헤맴을 아낀다.",
  3:"피드백은 센서처럼 감지하고, 내 일처럼 행동으로 답한다.",
  4:"실패도 꺼내놓으면, 다음 성공의 레시피다.",
  5:"마음은 못 읽으니, 요청은 COP로, 약속은 누가·언제·어디까지.",
  6:"방법은 달라도, 맛과 안전의 기준은 하나다.",
  7:"결정 전에는 마음껏 다르게 말하고, 결정 후에는 함께 움직인다.",
  8:"현장에서 답을 찾고, 데이터로 확인해 제대로 끝낸다.",
  9:"한 번 되면 가능성, 반복되면 실력, 누구나 재현하면 표준."
};
const COLS = {
  G:{name:"Good", ko:"잘된 점", q:"무엇이 효과적이었나요?",
     desc:"일잘법을 실천하면서 <b>무엇이 효과적이었는지</b> 확인해봐요. “좋았다”로 끝내지 말고 어떤 행동이 어떤 결과를 냈는지 적어요.",
     ex:"요청을 COP로 하니 되묻는 일이 확 줄었다", ph:"효과적이었던 것"},
  I:{name:"Improvement", ko:"개선할 점", q:"무엇을 더 좋게 만들까요?",
     desc:"<b>어떤 것을 더 좋게 만들 수 있을지</b> 고민해봐요. 사람 탓이 아니라 문장·상황·구조에서 원인을 찾아요.",
     ex:"문장이 9개라 현장에서 다 기억하기 어렵다", ph:"더 좋게 만들 점"},
  T:{name:"Try", ko:"다음에 해볼 행동", q:"구체적으로 무엇을 시도해볼까요?",
     desc:"그다음 <b>구체적으로 무엇을 시도해볼지</b> 적어요. 누가 봐도 바로 따라 할 수 있는 행동이면 좋아요.",
     ex:"월요일 조회 때 일잘법 하나씩 실제 사례로 나누기", ph:"시도해볼 행동"}
};
const STEPS = [
  {k:"intro", lbl:"시작하기"},
  {k:"learn", lbl:"퓨처릭스의 일잘법"},
  {k:"write", lbl:"GIT"},
  {k:"vote",  lbl:"투표"}
];

/* ---------- helpers ---------- */
const uid = () => Math.random().toString(36).slice(2,10) + Date.now().toString(36).slice(-4);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const LS = {
  get(k,d){ try{ const v=localStorage.getItem(k); return v==null?d:JSON.parse(v); }catch(e){ return d; } },
  set(k,v){ try{ localStorage.setItem(k,JSON.stringify(v)); }catch(e){} }
};
const likes = c => (c.likedBy||[]).length;
const thumb = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11H3V10h4Zm0 0 4-8a3 3 0 0 1 3 3v4h5.5a2 2 0 0 1 2 2.3l-1.4 8A2 2 0 0 1 18.1 21H7"/></svg>';

/* ---------- 나(이 브라우저) ---------- */
const me = LS.get("fx-me", null) || {id:"u_"+uid(), name:""};
LS.set("fx-me", me);
const prefs = Object.assign({step:0}, LS.get("fx-prefs", {}));
const savePrefs = () => LS.set("fx-prefs", prefs);
const ui = {fold: Object.assign({git:true, ref:false}, LS.get("fx-fold", {})), draft:{}, editCard:null, voteCol:null, gate:false, justOpened:false, copyText:null, focusGroup:null};

let toastTimer;
function toast(msg){ const t=document.getElementById("toast"); t.textContent=msg; t.hidden=false; clearTimeout(toastTimer); toastTimer=setTimeout(()=>t.hidden=true,2400); }

/* ============================================================
   저장소: local / cloud(Firestore) 공통 인터페이스
   ============================================================ */
const store = {cards:[], groups:[], status: CFG ? "connecting" : "local"};
let api = null;

function localApi(){
  const KEY = "fx-room-" + ROOM;
  const read = () => { const d=LS.get(KEY,{cards:[],groups:[]}); store.cards=d.cards||[]; store.groups=d.groups||[]; };
  const write = () => { LS.set(KEY,{cards:store.cards,groups:store.groups}); render(); };
  read();
  window.addEventListener("storage", e => { if(e.key===KEY){ read(); render(); } });
  const card = id => store.cards.find(c=>c.id===id) || {};
  return {
    addCard(c){ store.cards.push(c); write(); },
    updateCard(id,p){ Object.assign(card(id),p); write(); },
    updateCards(ids,p){ ids.forEach(id=>Object.assign(card(id),p)); write(); },
    deleteCard(id){ store.cards=store.cards.filter(c=>c.id!==id); write(); },
    toggleLike(id){ const c=card(id); const l=c.likedBy||(c.likedBy=[]); const i=l.indexOf(me.id); if(i<0) l.push(me.id); else l.splice(i,1); write(); },
    addGroup(g){ store.groups.push(g); write(); },
    updateGroup(id,p){ Object.assign(store.groups.find(g=>g.id===id)||{},p); write(); },
    deleteGroup(id){ store.cards.forEach(c=>{ if(c.groupId===id) c.groupId=null; }); store.groups=store.groups.filter(g=>g.id!==id); write(); }
  };
}

function cloudApi(){
  firebase.initializeApp(CFG);
  const db = firebase.firestore(), FV = firebase.firestore.FieldValue;
  const room = db.collection("rooms").doc(ROOM);
  const C = room.collection("cards"), G = room.collection("groups");
  const fail = e => { console.error(e); toast("저장하지 못했어요. 인터넷 연결을 확인해주세요"); };
  const seen = {c:false, g:false};
  const onErr = e => { console.error(e); store.status="error"; render(); };
  C.onSnapshot(s => { store.cards=s.docs.map(d=>({...d.data(), id:d.id})); seen.c=true; if(seen.g) store.status="live"; render(); }, onErr);
  G.onSnapshot(s => { store.groups=s.docs.map(d=>({...d.data(), id:d.id})); seen.g=true; if(seen.c) store.status="live"; render(); }, onErr);
  return {
    addCard(c){ C.doc(c.id).set(c).catch(fail); },
    updateCard(id,p){ C.doc(id).update(p).catch(fail); },
    updateCards(ids,p){ if(!ids.length) return; const b=db.batch(); ids.forEach(id=>b.update(C.doc(id),p)); b.commit().catch(fail); },
    deleteCard(id){ C.doc(id).delete().catch(fail); },
    toggleLike(id){ const c=store.cards.find(x=>x.id===id); const liked=(c.likedBy||[]).includes(me.id);
      C.doc(id).update({likedBy: liked ? FV.arrayRemove(me.id) : FV.arrayUnion(me.id)}).catch(fail); },
    addGroup(g){ G.doc(g.id).set(g).catch(fail); },
    updateGroup(id,p){ G.doc(id).update(p).catch(fail); },
    deleteGroup(id){ const b=db.batch(); store.cards.filter(c=>c.groupId===id).forEach(c=>b.update(C.doc(c.id),{groupId:null})); b.delete(G.doc(id)); b.commit().catch(fail); }
  };
}

function loadScript(src){ return new Promise((res,rej)=>{ const s=document.createElement("script"); s.src=src; s.onload=res; s.onerror=rej; document.head.appendChild(s); }); }
async function boot(){
  if(CFG){
    try{
      await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-app-compat.js`);
      await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-firestore-compat.js`);
      api = cloudApi();
    }catch(e){
      console.error(e); store.status="local"; api=localApi(); toast("실시간 연결에 실패해 이 기기에만 저장해요");
    }
  } else {
    api = localApi();
  }
  render();
}

/* ---------- 정렬 ---------- */
const byLikes = (a,b) => likes(b)-likes(a) || (a.created||0)-(b.created||0);
const cardsOf = (col, gid) => store.cards.filter(c=>c.col===col && (c.groupId||null)===(gid||null)).sort(byLikes);
const groupLikes = g => store.cards.filter(c=>c.groupId===g.id).reduce((s,c)=>s+likes(c),0);
const groupsOf = col => store.groups.filter(g=>g.col===col).sort((a,b)=>groupLikes(b)-groupLikes(a) || (a.created||0)-(b.created||0));

/* ============================================================
   화면
   ============================================================ */
const d = (key,def="") => esc(ui.draft[key] ?? def);

function render(){
  const app=document.getElementById("app");
  const ae=document.activeElement, fid=ae&&ae.id;
  const keep = fid && ("value" in ae) ? {v:ae.value, s:ae.selectionStart, e:ae.selectionEnd} : null;
  if(!me.name || ui.gate){
    app.innerHTML = gateHTML();
  } else {
    prefs.step = Math.min(Math.max(0,prefs.step||0), STEPS.length-1);
    const step = STEPS[prefs.step].k;
    const body = {intro:introHTML, learn:learnHTML, write:writeHTML, vote:voteHTML}[step]();
    app.innerHTML = topHTML() + `<main class="stage" data-step="${step}">${body}</main>` + navHTML();
  }
  if(fid){ const el=document.getElementById(fid); if(el){ if(keep && el.value!==keep.v && el.type!=="checkbox") el.value=keep.v; el.focus({preventScroll:true}); if(keep&&keep.s!=null) try{ el.setSelectionRange(keep.s,keep.e); }catch(e){} } }
  else if(!me.name || ui.gate) document.getElementById("gate-name")?.focus({preventScroll:true});
}

function statusPill(){
  const m = {live:["live","실시간 공유 중"], connecting:["wait","연결 중…"], local:["off","이 기기에만 저장"], error:["err","연결 오류"]}[store.status];
  return `<span class="sync sync-${m[0]}" title="${store.status==="local"?"firebase-config.js를 설정하면 모두의 의견이 실시간으로 공유돼요":""}">${m[1]}</span>`;
}

function gateHTML(){
  return `<div class="gate hero-x">
    <div class="hero-copy gate-box">
      <span class="eyebrow">FUTURIX · 일잘법 GIT 회고</span>
      <h1 class="hx"><span class="l1">시작하기 전에,</span><span class="l2">이름을 알려주세요.</span></h1>
      <i class="hx-bar" aria-hidden="true"></i>
      <p class="hx-sub">적은 의견은 이 이름으로 함께 보여요.</p>
      <form class="gate-form" id="gate-form" autocomplete="off">
        <input class="field" id="gate-name" data-draft="gate-name" value="${d("gate-name", me.name)}" placeholder="이름을 입력하세요 (예: 김퓨처)" aria-label="이름" maxlength="20">
        <button class="btn primary lg" type="submit">시작하기 <span aria-hidden="true">→</span></button>
      </form>
      ${ROOM!=="main"?`<p class="muted" style="font-size:13px">회고방 · <b>${esc(ROOM)}</b></p>`:""}
      ${ui.gate&&me.name?`<button class="btn sm ghost" data-act="closeGate">← 돌아가기</button>`:""}
    </div>
    <span class="hx-side" aria-hidden="true">GOOD · IMPROVEMENT · TRY</span>
  </div>`;
}

function topHTML(){
  return `<header class="top"><div class="top-row">
    <div class="brand"><span class="wordmark">Futurix</span><b>일잘법 GIT 회고${ROOM!=="main"?` · ${esc(ROOM)}`:""}</b></div>
    ${statusPill()}
    <div class="team-sel"><span class="muted">작성자</span><b>${esc(me.name)}</b></div>
    <button class="btn sm" data-act="copy">결과 복사</button>
  </div>
  <ol class="stepper" aria-label="회고 단계">
    ${STEPS.map((s,i)=>`<li><button data-act="go" data-i="${i}" ${i===prefs.step?'aria-current="step"':""} class="${i<prefs.step?"past":""}"><span class="n">${i+1}</span><span class="lbl">${s.lbl}</span></button></li>`).join("")}
  </ol></header>`;
}
function navHTML(){
  const i=prefs.step, prev=STEPS[i-1], next=STEPS[i+1];
  return `<nav class="navbar" aria-label="단계 이동"><div class="navbar-in">
    <span class="where"><span class="mono">${String(i+1).padStart(2,"0")}</span><i class="rule" aria-hidden="true"></i>${STEPS[i].lbl}<span class="of mono">/ ${String(STEPS.length).padStart(2,"0")}</span></span>
    ${prev?`<button class="btn" data-act="go" data-i="${i-1}">← ${prev.lbl}</button>`:""}
    ${next?`<button class="btn primary nav-next" data-act="go" data-i="${i+1}">다음: ${next.lbl} <span aria-hidden="true">→</span></button>`:`<button class="btn primary" data-act="copy">결과 복사</button>`}
  </div></nav>`;
}
function head(eyebrow, title, desc, how){
  return `<div class="stage-head"><span class="eyebrow">${eyebrow}</span><h1>${title}</h1>${desc?`<p>${desc}</p>`:""}${how?`<p class="how">${how}</p>`:""}</div>`;
}
function habitsGrid(){
  return `<div class="habits">${CATS.map(c=>`<div class="hcat"><div class="hcat-h"><b>${c.k}</b><span>${c.name}</span></div><small class="muted" style="font-size:13px">${c.ko}</small>
    ${c.hs.map(h=>`<div class="habit"><span class="no">${h}</span><span>${esc(HABITS[h])}</span></div>`).join("")}</div>`).join("")}</div>`;
}

/* 1. 시작하기 */
function introHTML(){
  return `<div class="intro hero-x">
    <div class="hero-copy">
      <span class="eyebrow">FUTURIX · 일하는 9가지 방법</span>
      <h1 class="hx"><span class="l1">우리가 만든 일잘법,</span><span class="l2">직접 써보니 어땠나요?</span></h1>
      <i class="hx-bar" aria-hidden="true"></i>
      <p class="hx-sub">Good · Improvement · Try로 돌아보고,<br>더 잘 맞는 방향을 함께 찾아봅니다.</p>
      <p class="motto">${MOTTO}</p>
      <div class="hx-cta"><button class="btn primary lg" data-act="go" data-i="1">시작하기 <span aria-hidden="true">→</span></button><button class="btn lg" data-act="go" data-i="2">바로 의견 쓰기 <span aria-hidden="true">→</span></button></div>
    </div>
    <span class="hx-side" aria-hidden="true">GOOD · IMPROVEMENT · TRY</span>
    <div class="howto">
      <span class="eyebrow">사용 방법</span>
      <ol>
        <li><div><b>퓨처릭스의 일잘법</b><span>오늘 돌아볼 퓨처릭스의 일하는 9가지 방법을 함께 읽어요.</span></div></li>
        <li><div><b>GIT</b><span>GIT(Good·Improvement·Try)가 무엇인지 확인하고, 일잘법을 써보며 느낀 점을 한 장에 하나씩 적어요. 내 의견은 언제든 수정·삭제할 수 있어요.</span></div></li>
        <li><div><b>투표</b><span>모두의 의견을 함께 보며 비슷한 것끼리 묶고, 좋아요를 누른 뒤 채택할 의견을 최종 확정해요.</span></div></li>
      </ol>
    </div>
  </div>`;
}

/* 2. 일잘법 알기 */
function learnHTML(){
  return head("2단계 · 퓨처릭스의 일잘법","퓨처릭스가 일하는 9가지 방법","오늘 함께 돌아볼 대상이에요. 우리가 함께 정한 일하는 방법을 먼저 천천히 읽어봐요.") +
  `<blockquote class="motto-big"><span class="eyebrow">FUTURIX WAY</span><p>${MOTTO}</p></blockquote>
  <div class="cat-intro">${CATS.map(c=>`<span><b>${c.k}</b> ${c.name} · ${c.ko}</span>`).join("")}</div>
  ${habitsGrid()}
  <p class="muted" style="margin-top:16px;font-size:14px">다음 단계에서 이 9가지 방법을 실제로 써보며 느낀 점을 Good · Improvement · Try로 적어요.</p>`;
}
function gitCards(){
  return `<div class="gits compact">${["G","I","T"].map(k=>{ const C=COLS[k]; return `<div class="git" data-col="${k}">
      <span class="L">${k}</span><h3>${C.name}<small>${C.ko}</small></h3>
      <p class="q">${C.q}</p><p>${C.desc}</p><p class="ex">예) ${esc(C.ex)}</p></div>`; }).join("")}</div>`;
}

/* 3. 의견 쓰기 — 내 의견만 보임 */
function writeHTML(){
  const others = store.cards.filter(c=>c.authorId!==me.id).length;
  return head("3단계 · GIT","일잘법을 써보니 어땠나요?","", "일잘법 <b>전체</b>를 떠올리며 G·I·T 칸에 한 카드에 하나씩 적어요. 특정 문장도, 전반적인 이야기도 좋아요.") +
  `<details class="ref" id="fold-git" data-fold="git" ${ui.fold.git?"open":""}><summary><span class="eyebrow">GIT란? · Good · Improvement · Try</span><span class="muted ref-tog"></span></summary>
    <p class="muted" style="margin:-2px 0 12px;font-size:14px">세 가지 질문으로 일잘법을 돌아봐요. 각 칸이 무엇을 뜻하는지 확인한 뒤 아래에 적어주세요.</p>${gitCards()}</details>
  <details class="ref" id="fold-ref" data-fold="ref" ${ui.fold.ref?"open":""}><summary><span class="eyebrow">돌아볼 대상 · 일하는 9가지 방법</span><span class="muted ref-tog"></span></summary>${habitsGrid()}</details>
  <div class="board">${["G","I","T"].map(col=>{ const C=COLS[col]; const mine=store.cards.filter(c=>c.col===col&&c.authorId===me.id).sort((a,b)=>(b.created||0)-(a.created||0));
    return `<div class="col" data-col="${col}">
      <div class="col-head"><div class="col-title"><span class="col-letter">${col}</span><h3>${C.name} · ${C.ko}</h3></div><p class="col-q">${C.q}</p></div>
      <div class="col-tools">
        <textarea class="field" id="new-${col}" data-draft="new-${col}" rows="2" maxlength="500" placeholder="${C.ph} (Ctrl+Enter로 올리기)">${d("new-"+col)}</textarea>
        <div class="addrow"><span class="muted" style="font-size:12.5px">예) ${esc(C.ex)}</span><button class="btn primary sm" data-act="addCard" data-col="${col}" style="margin-left:auto;flex:none">올리기</button></div>
      </div>
      <div class="col-body"><div class="dropzone">${mine.length?mine.map(c=>cardHTML(c,"write")).join(""):`<p class="empty">아직 쓴 의견이 없어요</p>`}</div></div>
    </div>`; }).join("")}</div>
  <p class="muted" style="margin-top:14px;font-size:13.5px">다른 사람의 의견 <b class="mono">${others}</b>개는 4단계 투표에서 함께 봐요.</p>`;
}

/* 4. 투표 — 모두의 의견 */
function voteHTML(){
  const col=ui.voteCol;
  return head("4단계 · 투표","공감되는 의견에 투표해요","",
    "G · I · T 중 하나를 누르면 모두의 의견이 펼쳐져요. 비슷한 의견은 카드를 끌어 그룹으로 묶고, 공감되는 카드에 좋아요를 눌러요. 좋아요는 한 의견에 한 번만 누를 수 있고, 다시 누르면 취소돼요. 좋아요가 많은 순으로 자동 정렬되고, 채택할 의견에는 <b>‘최종 확정’</b>을 눌러요.") +
  `<div class="gps" role="group" aria-label="볼 항목">${["G","I","T"].map(k=>{ const C=COLS[k], all=store.cards.filter(c=>c.col===k), lk=all.reduce((s,c)=>s+likes(c),0);
      return `<button class="gp" data-col="${k}" data-act="voteCol" aria-pressed="${col===k}"><span class="L">${k}</span><span class="gp-t"><b>${C.name}</b><small>${C.ko}</small></span><span class="gp-n mono">${all.length}<small>의견</small> · ♥${lk}</span></button>`; }).join("")}</div>`
  + (col ? voteBoard(col) : `<p class="vote-empty">위에서 G · I · T 중 하나를 눌러 의견을 펼쳐보세요.</p>`)
  + (ui.copyText!=null?`<textarea class="copybox field" id="copybox" readonly aria-label="복사할 결과" style="margin-top:18px">${esc(ui.copyText)}</textarea>`:"");
}
function voteBoard(col){
  const groups=groupsOf(col), loose=cardsOf(col,null), all=store.cards.filter(c=>c.col===col);
  const rank=new Map([...all].sort(byLikes).map((c,i)=>[c.id,i+1]));
  const list=arr=>arr.map(c=>cardHTML(c,"vote",rank.get(c.id))).join("");
  return `<div class="vote${ui.justOpened?" git-open":""}" data-col="${col}">
    <div class="vote-bar"><h2><span class="L">${col}</span>${COLS[col].name} 의견 <span class="mono muted">${all.length}</span></h2>
      <div class="addrow"><input class="field" id="ng-${col}" data-draft="ng-${col}" maxlength="40" placeholder="새 그룹 이름" value="${d("ng-"+col)}" style="width:150px"><button class="btn sm" data-act="addGroup" data-col="${col}">+ 그룹 만들기</button></div></div>
    ${all.length?"":`<p class="vote-empty">아직 이 칸에 쓴 의견이 없어요.</p>`}
    <div class="vgroups">
      ${groups.map(g=>{ const cs=cardsOf(col,g.id); return `<div class="group">
        <div class="group-head"><input class="group-name" id="gn-${g.id}" value="${esc(g.name)}" maxlength="40" data-chg="groupName" data-id="${g.id}" aria-label="그룹 이름">
          <span class="group-sum mono">♥ ${groupLikes(g)} · ${cs.length}장</span><button class="ibtn" data-act="delGroup" data-id="${g.id}">그룹 풀기</button></div>
        <div class="dropzone" data-col="${col}" data-group="${g.id}">${cs.length?list(cs):`<p class="empty">카드를 여기로 끌어오세요</p>`}</div></div>`; }).join("")}
      ${all.length?`<div class="dropzone newgroup" data-col="${col}" data-group="__new"><span>＋</span>여기로 카드를 끌어오면<br>새 그룹이 만들어져요</div>`:""}
    </div>
    ${all.length?`<h3 class="pool-h">아직 묶지 않은 의견 <span class="mono muted">${loose.length}</span></h3>
    <div class="dropzone pool" data-col="${col}" data-group="">${loose.length?list(loose):`<p class="empty">모든 의견을 그룹으로 묶었어요. 그룹에서 빼려면 카드를 여기로 끌어오세요.</p>`}</div>`:""}
  </div>`;
}

function cardHTML(c, phase, rank){
  const mine = c.authorId===me.id;
  if(ui.editCard===c.id){
    return `<article class="card" data-card="${c.id}">
      <textarea class="field" id="ec-${c.id}" data-draft="ec-${c.id}" rows="3" maxlength="500">${d("ec-"+c.id, c.text)}</textarea>
      <div class="card-foot"><button class="btn sm primary" data-act="saveCard" data-id="${c.id}">저장</button><button class="btn sm ghost" data-act="cancelEdit">취소</button></div></article>`;
  }
  const vote = phase==="vote", n=likes(c), liked=(c.likedBy||[]).includes(me.id);
  const groups = store.groups.filter(g=>g.col===c.col);
  return `<article class="card${c.confirmed?" confirmed":""}" ${vote?'draggable="true"':""} data-card="${c.id}">
    ${c.confirmed?`<span class="conf-badge">✓ 최종 확정</span>`:""}
    <p class="card-text">${vote&&n>0?`<span class="rank">#${rank}</span>`:""}${esc(c.text)}</p>
    ${vote&&c.author?`<div class="card-meta"><span>— ${esc(c.author)}${mine?" (나)":""}</span></div>`:""}
    <div class="card-foot">
      ${vote?`<button class="like ${liked?"hot":""}" data-act="like" data-id="${c.id}" aria-pressed="${liked}" aria-label="좋아요 ${n}개. ${liked?"누르면 내 좋아요 취소":"누르면 좋아요"}" title="${liked?"내가 누른 좋아요 · 다시 누르면 취소":"한 의견에 한 번만 누를 수 있어요"}">${thumb}<span class="mono">${n}</span></button>
        <button class="conf-btn" data-act="confirm" data-id="${c.id}" aria-pressed="${!!c.confirmed}">${c.confirmed?"확정 취소":"최종 확정"}</button>`:""}
      ${mine?`<button class="ibtn" data-act="editCard" data-id="${c.id}">수정</button><button class="ibtn" data-act="delCard" data-id="${c.id}">삭제</button>`:""}
      ${vote?`<select data-chg="cardGroup" data-id="${c.id}" aria-label="그룹 선택" id="cg-${c.id}"><option value="">그룹 없음</option>${groups.map(g=>`<option value="${g.id}" ${g.id===c.groupId?"selected":""}>${esc(g.name)}</option>`).join("")}</select>`:""}
    </div></article>`;
}

/* ---------- 결과 복사 ---------- */
function exportText(){
  const L=[`# 퓨처릭스 일잘법 GIT 회고${ROOM!=="main"?` · ${ROOM}`:""}`, `참여 ${new Set(store.cards.map(c=>c.authorId)).size}명 · 의견 ${store.cards.length}개`, ""];
  const line=c=>`- ${c.confirmed?"[확정] ":""}${c.text} (좋아요 ${likes(c)}${c.author?` · ${c.author}`:""})`;
  const conf=store.cards.filter(c=>c.confirmed).sort(byLikes);
  if(conf.length){ L.push("## 최종 확정한 의견"); conf.forEach(c=>L.push(`- [${c.col}] ${c.text} (좋아요 ${likes(c)})`)); L.push(""); }
  ["G","I","T"].forEach(col=>{
    L.push(`## ${COLS[col].name} (${COLS[col].ko})`);
    groupsOf(col).forEach(g=>{ L.push(`### ${g.name}`); cardsOf(col,g.id).forEach(c=>L.push(line(c))); });
    cardsOf(col,null).forEach(c=>L.push(line(c)));
    L.push("");
  });
  return L.join("\n");
}

/* ============================================================
   동작
   ============================================================ */
const findCard = id => store.cards.find(c=>c.id===id);
function arm(btn, fn){
  if(btn.dataset.armed){ fn(); return; }
  btn.dataset.armed="1"; const old=btn.textContent; btn.textContent="한 번 더 누르면 삭제"; btn.classList.add("armed");
  setTimeout(()=>{ if(btn.isConnected){ delete btn.dataset.armed; btn.textContent=old; btn.classList.remove("armed"); } },3000);
}
function need(){ if(!api){ toast("아직 불러오는 중이에요"); return false; } return true; }
function enterName(n){
  n=String(n||"").trim().slice(0,20);
  if(!n){ toast("이름을 입력해주세요"); document.getElementById("gate-name")?.focus(); return; }
  const changed = me.name && me.name!==n;
  me.name=n; LS.set("fx-me",me);
  if(changed && api) api.updateCards(store.cards.filter(c=>c.authorId===me.id).map(c=>c.id),{author:n});
  ui.gate=false; delete ui.draft["gate-name"];
  render(); window.scrollTo({top:0}); toast(`${n}님, 환영해요`);
}

const H = {
  go(t){ prefs.step=Number(t.dataset.i); savePrefs(); ui.editCard=null; ui.copyText=null; render(); window.scrollTo({top:0}); },
  openGate(){ ui.gate=true; render(); window.scrollTo({top:0}); },
  closeGate(){ ui.gate=false; render(); },
  addCard(t){ if(!need()) return; const col=t.dataset.col, k="new-"+col, text=(ui.draft[k]||"").trim().slice(0,500);
    if(!text){ document.getElementById(k)?.focus(); return; }
    api.addCard({id:uid(), col, text, author:me.name, authorId:me.id, likedBy:[], groupId:null, confirmed:false, created:Date.now()});
    delete ui.draft[k]; const el=document.getElementById(k); if(el) el.value=""; },
  like(t){ if(need()) api.toggleLike(t.dataset.id); },
  confirm(t){ if(!need()) return; const c=findCard(t.dataset.id); api.updateCard(c.id,{confirmed:!c.confirmed}); toast(c.confirmed?"확정을 취소했어요":"최종 확정했어요"); },
  editCard(t){ ui.editCard=t.dataset.id; render(); const el=document.getElementById("ec-"+t.dataset.id); if(el){ el.focus(); el.setSelectionRange(el.value.length,el.value.length); } },
  saveCard(t){ const id=t.dataset.id, v=(document.getElementById("ec-"+id)?.value||"").trim().slice(0,500); if(v) api.updateCard(id,{text:v}); delete ui.draft["ec-"+id]; ui.editCard=null; render(); },
  cancelEdit(){ if(ui.editCard) delete ui.draft["ec-"+ui.editCard]; ui.editCard=null; render(); },
  delCard(t){ arm(t,()=>{ api.deleteCard(t.dataset.id); toast("의견을 삭제했어요"); }); },
  voteCol(t){ const k=t.dataset.col; ui.voteCol = ui.voteCol===k ? null : k; ui.justOpened=true; render(); ui.justOpened=false; },
  addGroup(t){ if(!need()) return; const col=t.dataset.col, k="ng-"+col, n=(ui.draft[k]||"").trim().slice(0,40)||"새 그룹";
    api.addGroup({id:uid(), col, name:n, created:Date.now()}); delete ui.draft[k]; toast(`‘${n}’ 그룹을 만들었어요. 카드를 끌어 넣으세요`); },
  delGroup(t){ api.deleteGroup(t.dataset.id); },
  copy(){ const text=exportText();
    const fallback=()=>{ prefs.step=STEPS.length-1; savePrefs(); ui.copyText=text; render(); const el=document.getElementById("copybox"); el?.scrollIntoView({block:"center"}); el?.select(); toast("아래 상자의 내용을 복사하세요"); };
    try{ navigator.clipboard.writeText(text).then(()=>toast("회고 결과를 복사했어요"), fallback); }catch(e){ fallback(); } }
};

document.addEventListener("click", e=>{ const t=e.target.closest("[data-act]"); if(!t) return; const f=H[t.dataset.act]; if(f){ e.preventDefault(); f(t); } });
document.addEventListener("toggle", e=>{ const k=e.target.dataset?.fold; if(k){ ui.fold[k]=e.target.open; LS.set("fx-fold", ui.fold); } }, true);
document.addEventListener("input", e=>{ const k=e.target.dataset?.draft; if(k) ui.draft[k]=e.target.value; });
document.addEventListener("change", e=>{ const t=e.target, k=t.dataset?.chg; if(!k||!api) return;
  if(k==="groupName"){ const v=t.value.trim().slice(0,40); if(v) api.updateGroup(t.dataset.id,{name:v}); }
  else if(k==="cardGroup"){ api.updateCard(t.dataset.id,{groupId:t.value||null}); } });
document.addEventListener("submit", e=>{ if(e.target.id==="gate-form"){ e.preventDefault(); enterName(document.getElementById("gate-name").value); } });
document.addEventListener("keydown", e=>{ const id=e.target.id||"";
  if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)&&id.startsWith("new-")){ e.preventDefault(); H.addCard({dataset:{col:id.slice(4)}}); }
  if(e.key==="Enter"&&!e.shiftKey&&id.startsWith("ng-")){ e.preventDefault(); H.addGroup({dataset:{col:id.slice(3)}}); }
  if(e.key==="Enter"&&id.startsWith("gn-")){ e.preventDefault(); e.target.blur(); }
  if(e.key==="Escape"&&ui.editCard){ H.cancelEdit(); } });

/* ---------- 드래그 앤 드롭 (투표) ---------- */
let dragId=null;
const clearOver=()=>document.querySelectorAll(".over").forEach(x=>x.classList.remove("over"));
document.addEventListener("dragstart", e=>{ const c=e.target.closest&&e.target.closest(".card[draggable]"); if(!c) return;
  dragId=c.dataset.card; e.dataTransfer.effectAllowed="move"; try{ e.dataTransfer.setData("text/plain",dragId); }catch(_){} c.classList.add("dragging"); });
document.addEventListener("dragend", ()=>{ dragId=null; clearOver(); document.querySelectorAll(".dragging").forEach(x=>x.classList.remove("dragging")); });
document.addEventListener("dragover", e=>{ if(!dragId) return; const z=e.target.closest(".dropzone[data-col]"); if(!z) return; e.preventDefault(); clearOver(); z.classList.add("over"); });
document.addEventListener("drop", e=>{ if(!dragId||!api) return; const z=e.target.closest(".dropzone[data-col]"); if(!z) return; e.preventDefault();
  const c=findCard(dragId); dragId=null; clearOver(); if(!c) return;
  let gid=z.dataset.group||null;
  if(gid==="__new"){ const g={id:uid(), col:z.dataset.col, name:"새 그룹", created:Date.now()}; api.addGroup(g); gid=g.id; ui.focusGroup=g.id; }
  if((c.groupId||null)!==gid) api.updateCard(c.id,{groupId:gid});
  if(ui.focusGroup){ const id=ui.focusGroup; ui.focusGroup=null; setTimeout(()=>{ const el=document.getElementById("gn-"+id); if(el){ el.focus(); el.select(); toast("새 그룹을 만들었어요. 이름을 바꿔주세요"); } },60); }
});

render();
boot();
})();
