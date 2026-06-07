'use strict';

const AXES = ['spicy','energy','chat','daytime','evening','latenight','otaku','collab','skill'];
const FIELD_MAP = {spicy:'매운맛',energy:'텐션',chat:'채팅속도',daytime:'낮비중',evening:'저녁비중',latenight:'새벽비중',otaku:'덕후지수',collab:'합방비중',skill:'실력지수'};
const OFFICIAL_WORDS = ['공식','뉴스','live','중계','치지직','jtbc','spotv','lck','pubg','발로란트'];
const INCLUDE_DULLAHAN_WHEN_EXCLUDING_VTUBERS = true; // TODO: 듀라한도 제외하려면 false로 변경하세요.
const SAVE_KEY = 'stream-match-state-v1';

// TODO: 문항을 추가하거나 선택지별 축 점수를 조정할 때 이 배열을 수정하세요. 점수 범위는 0~5입니다.
const QUESTIONS = [
  {q:'오늘 밤 방송을 켰을 때 원하는 분위기는?', a:[['채팅창 불타는 매운맛 토크',{spicy:5,chat:5}],['하이텐션 리액션 폭발',{energy:5,chat:4}],['잔잔하게 틀어놓는 힐링 방송',{spicy:0,energy:1,chat:1}],['실력으로 증명하는 게임 방송',{skill:5,energy:2}]]},
  {q:'채팅창은 어느 정도가 좋아?', a:[['초당 100줄, 정신없어야 방송이지',{chat:5,energy:4}],['적당히 빠르게 티키타카',{chat:3.5,energy:3}],['천천히 읽히는 채팅',{chat:1,energy:1.5}],['채팅보다 방송 내용에 집중',{chat:0,skill:4}]]},
  {q:'주로 방송 보는 시간대는?', a:[['해 떠 있을 때 보는 낮방',{daytime:5,evening:1,latenight:0}],['저녁 황금시간 사수',{daytime:0,evening:5,latenight:1}],['진짜 방송은 새벽 감성',{daytime:0,evening:1,latenight:5}],['시간 상관없이 재미만 있으면 됨',{daytime:3,evening:3,latenight:3}]]},
  {q:'합방, 어디까지 좋아하세요?', a:[['많을수록 좋다. 북적북적 최고',{collab:5,chat:4}],['가끔 터지는 레전드 합방만',{collab:3}],['혼자서 꽉 채우는 방송이 좋다',{collab:0}],['대형 서버·대회면 무조건 본다',{collab:5,skill:4}]]},
  {q:'내가 끌리는 방송인은?', a:[['유행어 제조기, 밈의 근원',{spicy:4,chat:5}],['실력으로 찍어누르는 사람',{skill:5}],['세계관과 캐릭터가 확실한 사람',{otaku:5,energy:4}],['편하게 오래 볼 수 있는 사람',{energy:1.5,spicy:1,chat:2}]]},
  {q:'게임 방송에서 가장 중요한 건?', a:[['눈을 의심하게 하는 피지컬',{skill:5,energy:3}],['분석과 운영, 뇌지컬',{skill:4.5,energy:1}],['억까도 콘텐츠로 만드는 리액션',{energy:5,spicy:3}],['스토리에 과몰입하는 맛',{otaku:4.5,energy:3}]]},
  {q:'방송 매운맛 허용 범위는?', a:[['순한맛만 주세요',{spicy:0}],['살짝 매콤한 정도',{spicy:2}],['불닭 정도는 가능',{spicy:4}],['매울수록 도파민 폭발',{spicy:5}]]},
  {q:'나는 이런 팬덤 분위기가 좋다', a:[['밈으로 하나 되는 분위기',{chat:5,spicy:3}],['훈훈하고 편한 분위기',{chat:2,spicy:0}],['덕질과 과몰입, 오히려 좋아',{otaku:5}],['대회·합방 때 단체 응원',{collab:5,skill:3}]]},
  {q:'방송을 켜놓는 방식은?', a:[['본방은 무조건 집중해서 본다',{skill:4,chat:3}],['게임하면서 옆에 오래 틀어둔다',{energy:1.5,chat:2}],['자기 전 새벽에 정주행',{latenight:5,energy:1}],['클립 보고 본방까지 따라간다',{energy:4,chat:4}]]},
  {q:'이번에 추천받고 싶은 스트리머는?', a:[['내 최애랑 결이 비슷한 사람',{favoriteWeight:.45}],['최애와 다르지만 취향은 맞는 사람',{favoriteWeight:.15}],['완전히 새로운 장르 개척',{favoriteWeight:0}],['요즘 핫한 방송 분위기',{chat:5,energy:5,favoriteWeight:.1}]]}
];

const CHAT_POOL = [
  ['초록괴물','오 성향 테스트 뭐임?'],['도파민수급중','나랑 찰떡 누구 나올지 궁금하다'],['새벽3시출석','ㅋㅋㅋㅋ 매운맛 선택 간다'],['방구석분석가','데이터 598명 실화냐'],['클립중독','이거 결과 공유해야지'],['평범한시청자','디자인 방송 같아서 좋네'],['치즈볼','추천 맛집 입장했습니다'],['과몰입금지','최애 고르면 더 정확한가 봄']
];

let streamers = [];
let lock = false;
let state = loadState();
const app = document.querySelector('#app');
const sceneLabel = document.querySelector('#scene-label');
const chatLog = document.querySelector('#chat-log');

/** 저장 데이터가 깨져 있어도 안전한 기본 상태를 반환합니다. */
function loadState(){
  const base={scene:'start',includeVtuber:true,favorite:'',answers:[]};
  try{const saved=JSON.parse(sessionStorage.getItem(SAVE_KEY));return {...base,...saved,answers:Array.isArray(saved?.answers)?saved.answers:[]};}catch{return base;}
}
function saveState(){try{sessionStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch{/* private mode 등 저장 불가 상황은 무시 */}}
function esc(value=''){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function num(value,fallback=2.5){const n=Number.parseFloat(value);return Number.isFinite(n)?Math.min(5,Math.max(0,n)):fallback;}
function nameOf(s){return String(s?.정제된이름||'이름 미상').trim()||'이름 미상';}
function announce(message){const t=document.querySelector('#toast');t.textContent=message;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);addChat('매칭봇',message,true);}
function setScene(label){sceneLabel.textContent=label;saveState();window.scrollTo({top:0,behavior:'smooth'});}

/** 오른쪽 장식 채팅창에 메시지를 추가하고 개수를 제한합니다. */
function addChat(name,text,bot=false){
  const colors=['#75d6ff','#ffe073','#ff82ab','#a998ff','#7effb6'];
  const row=document.createElement('div');row.className='chat-message';
  row.innerHTML=`<span class="chat-name" style="color:${bot?'#00ffa3':colors[Math.floor(Math.random()*colors.length)]}">${esc(name)}</span>${esc(text)}`;
  chatLog.append(row);while(chatLog.children.length>11)chatLog.firstElementChild.remove();
}
function seedChat(){CHAT_POOL.slice(0,8).forEach(([n,t],i)=>setTimeout(()=>addChat(n,t),i*90));}

/** JSON을 불러오고 최소한의 유효성 검사를 거친 뒤 앱을 시작합니다. */
async function init(){
  seedChat();
  try{
    const response=await fetch('data/streamers.json',{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    if(!Array.isArray(data)||!data.length)throw new Error('스트리머 데이터가 비어 있습니다.');
    streamers=data.filter(x=>x&&typeof x==='object'&&nameOf(x)!=='이름 미상');
    if(!streamers.length)throw new Error('사용 가능한 스트리머가 없습니다.');
    if(state.scene==='quiz'&&state.answers.length>=QUESTIONS.length)state.scene='result';
    render();
  }catch(error){
    console.warn('Streamer data load failed:',error);
    app.innerHTML=`<section class="screen"><div class="error-box"><div class="eyebrow">LOAD ERROR</div><h2>스트리머 명단을 불러오지 못했어요</h2><p class="screen-desc">인터넷 연결을 확인하거나, 로컬에서 파일을 직접 열었다면 간단한 웹 서버로 실행해주세요.</p><button class="primary-btn" onclick="location.reload()">다시 시도</button></div></section>`;
  }
}
function render(){({start:renderStart,favorite:renderFavorite,quiz:renderQuiz,result:renderResult}[state.scene]||renderStart)();}

/** 첫 화면과 버튜버 포함 필터를 렌더링합니다. */
function renderStart(){
  setScene('성향 분석 대기실');
  app.innerHTML=`<section class="screen"><div class="eyebrow">Find your next streamer</div><h1 class="hero-title">인터넷방송<br><em>성향 테스트</em></h1><p class="subtitle">당신의 방송 취향을 분석해서 찰떡 스트리머를 추천합니다.<br>10개의 질문, 약 1분이면 충분해요.</p><div class="choice-label">추천 결과에 버튜버를 포함할까요?</div><div class="mode-options"><label class="mode-option"><input type="radio" name="vtuber" value="yes" ${state.includeVtuber?'checked':''}><span class="mode-card">버튜버 포함<small>캠방 · 듀라한 · 버튜버 모두 추천</small></span></label><label class="mode-option"><input type="radio" name="vtuber" value="no" ${!state.includeVtuber?'checked':''}><span class="mode-card">버튜버 제외<small>${INCLUDE_DULLAHAN_WHEN_EXCLUDING_VTUBERS?'캠방 · 듀라한 추천':'캠방만 추천'}</small></span></label></div><div class="action-row"><button class="primary-btn" id="start-btn">취향 분석 시작하기 →</button><span class="microcopy">현재 ${streamers.length}명의 방송 데이터 분석 준비 완료</span></div><div class="donation"><strong>₩ 10,000 취향저격님</strong><p>제 다음 최애를 찾아주세요!<br>매운맛에 새벽방송 좋아합니다</p></div></section>`;
  document.querySelectorAll('[name=vtuber]').forEach(el=>el.addEventListener('change',()=>{state.includeVtuber=el.value==='yes';saveState();}));
  document.querySelector('#start-btn').addEventListener('click',()=>{state.scene='favorite';saveState();render();announce('취향 분석을 시작합니다!');});
}

/** 검색 가능한 최애 스트리머 선택 화면을 렌더링합니다. */
function renderFavorite(){
  setScene('최애 스트리머 입력 중');
  app.innerHTML=`<section class="screen"><div class="eyebrow">Step 01 · optional</div><h2 class="screen-title">가장 많이 보는 스트리머<br>1명을 골라주세요</h2><p class="screen-desc">최애와 결이 비슷한 방송인을 찾는 데 활용해요. 입력하지 않고 건너뛰어도 괜찮습니다.</p><div class="search-wrap"><input id="favorite-input" class="search-input" autocomplete="off" placeholder="스트리머 이름 검색" value="${esc(state.favorite)}"><span class="search-icon">⌕</span><div id="suggestions" class="suggestions" hidden></div></div><div id="favorite-chip">${state.favorite?`<span class="favorite-chip">♥ ${esc(state.favorite)} 선택됨</span>`:''}</div><div class="action-row"><button class="primary-btn" id="favorite-next">${state.favorite?'이 최애로 계속하기':'건너뛰고 계속하기'} →</button><button class="secondary-btn" id="to-start">이전</button></div></section>`;
  const input=document.querySelector('#favorite-input'), box=document.querySelector('#suggestions');
  const update=()=>{
    const query=input.value.trim().toLowerCase();
    const matches=streamers.filter(s=>nameOf(s).toLowerCase().includes(query)).slice(0,8);
    if(!query||!matches.length){box.hidden=true;return;}
    box.innerHTML=matches.map((s,i)=>`<button class="suggestion" data-i="${i}">${esc(nameOf(s))}<small>${esc(s['주력/종합게임']||'종합 방송')}</small></button>`).join('');box.hidden=false;
    box.querySelectorAll('button').forEach((b,i)=>b.onclick=()=>{state.favorite=nameOf(matches[i]);saveState();renderFavorite();});
  };
  input.addEventListener('input',()=>{state.favorite='';saveState();update();});input.addEventListener('focus',update);
  document.querySelector('#favorite-next').onclick=()=>{state.scene='quiz';saveState();render();};
  document.querySelector('#to-start').onclick=()=>{state.scene='start';saveState();render();};
}

/** 현재 문항을 표시하고 빠른 중복 클릭을 잠금 처리합니다. */
function renderQuiz(){
  const index=Math.min(state.answers.length,QUESTIONS.length-1), item=QUESTIONS[index];
  setScene(`성향 분석 중 · ${index+1}/${QUESTIONS.length}`);
  app.innerHTML=`<section class="screen quiz-screen"><div class="progress-meta"><span>취향 분석 진행률</span><strong>${index+1} / ${QUESTIONS.length}</strong></div><div class="progress-track"><div class="progress-fill" style="width:${(index/QUESTIONS.length)*100}%"></div></div><h2 class="question-title">${esc(item.q)}</h2><div class="answer-grid">${item.a.map((a,i)=>`<button class="answer-btn" data-index="${i}" data-key="${String.fromCharCode(65+i)}">${esc(a[0])}</button>`).join('')}</div>${index?'<button class="back-btn" id="quiz-back">← 이전 질문으로</button>':''}</section>`;
  document.querySelectorAll('.answer-btn').forEach(btn=>btn.onclick=()=>{
    if(lock)return;lock=true;btn.classList.add('selected');state.answers.push(Number(btn.dataset.index));saveState();
    addChat('선택완료',`“${item.a[Number(btn.dataset.index)][0]}” 역시 이거지`,true);
    setTimeout(()=>{state.scene=state.answers.length>=QUESTIONS.length?'result':'quiz';lock=false;render();},260);
  });
  document.querySelector('#quiz-back')?.addEventListener('click',()=>{if(lock)return;state.answers.pop();saveState();render();});
}

/** 답변들을 축별 평균 0~5 벡터로 변환합니다. */
function buildUserVector(){
  const totals=Object.fromEntries(AXES.map(k=>[k,0])), counts=Object.fromEntries(AXES.map(k=>[k,0]));let favoriteWeight=.3;
  state.answers.forEach((answer,i)=>{const vector=QUESTIONS[i]?.a?.[answer]?.[1]||{};AXES.forEach(k=>{if(Number.isFinite(vector[k])){totals[k]+=vector[k];counts[k]++;}});if(Number.isFinite(vector.favoriteWeight))favoriteWeight=vector.favoriteWeight;});
  return {vector:Object.fromEntries(AXES.map(k=>[k,counts[k]?totals[k]/counts[k]:2.5])),favoriteWeight};
}
/** 데이터의 시간대 비율(0~1)과 일반 지표(0~5)를 동일 범위로 정규화합니다. */
function streamerVector(s){return Object.fromEntries(AXES.map(k=>{const raw=num(s?.[FIELD_MAP[k]]);return ['daytime','evening','latenight'].includes(k)&&raw<=1?raw*5:raw;}));}
function cosine(a,b){let dot=0,aa=0,bb=0;AXES.forEach(k=>{dot+=a[k]*b[k];aa+=a[k]**2;bb+=b[k]**2;});return aa&&bb?dot/(Math.sqrt(aa)*Math.sqrt(bb)):0;}
function distanceScore(a,b){const d=Math.sqrt(AXES.reduce((sum,k)=>sum+(a[k]-b[k])**2,0)/AXES.length);return Math.max(0,1-d/5);}
function similarity(a,b){return cosine(a,b)*.45+distanceScore(a,b)*.55;}
function isOfficial(s){const n=nameOf(s).toLowerCase();return OFFICIAL_WORDS.some(word=>n.includes(word));}
function candidates(){return streamers.filter(s=>!isOfficial(s)&&nameOf(s)!==state.favorite&&(state.includeVtuber||s.버튜버여부!=='버튜버')&&(state.includeVtuber||INCLUDE_DULLAHAN_WHEN_EXCLUDING_VTUBERS||s.버튜버여부!=='듀라한'));}

/** 필터와 최애 가중치를 적용해 추천 후보를 안전하게 정렬합니다. */
function recommendations(){
  const {vector,favoriteWeight}=buildUserVector(), favorite=streamers.find(s=>nameOf(s)===state.favorite), favVector=favorite?streamerVector(favorite):null;
  let pool=candidates();if(!pool.length)pool=streamers.filter(s=>nameOf(s)!==state.favorite&&!isOfficial(s));if(!pool.length)pool=streamers.filter(s=>nameOf(s)!==state.favorite);
  const fw=favVector?favoriteWeight:0;
  return pool.map(s=>{const test=similarity(vector,streamerVector(s)),fav=favVector?similarity(favVector,streamerVector(s)):0;return {s,score:test*(1-fw)+fav*fw};}).sort((a,b)=>b.score-a.score).slice(0,5);
}
function typeName(v){const sorted=[['매운맛',v.spicy],['하이텐션',v.energy],['채팅 폭주',v.chat],['낮방 출석',v.daytime],['황금시간',v.evening],['밤샘',v.latenight],['과몰입 덕후',v.otaku],['합방 축제',v.collab],['실력충',v.skill]].sort((a,b)=>b[1]-a[1]);return `${sorted[0][0]} ${sorted[1][0]} 중독형`;}
function reasonFor(s,v){const sv=streamerVector(s);const close=AXES.map(k=>[k,Math.abs(v[k]-sv[k])]).sort((a,b)=>a[1]-b[1]).slice(0,2).map(x=>FIELD_MAP[x[0]]);return `당신이 원하는 ${close.join('과 ')} 취향이 특히 잘 맞아요. ${state.favorite?`${esc(state.favorite)}의 결도 반영했지만, 테스트 응답을 중심으로 골랐습니다.`:'최애 정보 없이도 응답한 취향만으로 가장 가까운 방송을 찾았습니다.'}`;}

/** 결과 화면용 반응형 SVG 레이더 차트를 생성합니다. */
function radarSvg(v){
  const axes=[['매운맛',v.spicy],['텐션',v.energy],['채팅',v.chat],['새벽감성',v.latenight],['덕후력',v.otaku],['실력충',v.skill]],cx=160,cy=145,r=100;
  const point=(i,ratio=1)=>{const a=-Math.PI/2+i*Math.PI/3;return [cx+Math.cos(a)*r*ratio,cy+Math.sin(a)*r*ratio]};
  const rings=[.25,.5,.75,1].map(n=>axes.map((_,i)=>point(i,n).join(',')).join(' '));
  const valuePoints=axes.map((x,i)=>point(i,x[1]/5).join(',')).join(' ');
  return `<svg class="radar" viewBox="0 0 320 300" role="img" aria-label="취향 레이더 차트">${rings.map(p=>`<polygon points="${p}" fill="none" stroke="#33413b" stroke-width="1"/>`).join('')}${axes.map((x,i)=>{const p=point(i,1.25);return `<line x1="${cx}" y1="${cy}" x2="${point(i)[0]}" y2="${point(i)[1]}" stroke="#29352f"/><text x="${p[0]}" y="${p[1]}" fill="#9baba3" font-size="10" text-anchor="middle" dominant-baseline="middle">${x[0]}</text>`}).join('')}<polygon points="${valuePoints}" fill="rgba(0,255,163,.20)" stroke="#00ffa3" stroke-width="2"/>${axes.map((x,i)=>{const p=point(i,x[1]/5);return `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="#00ffa3"/>`}).join('')}</svg>`;
}
function resultCard(item,i){const s=item.s,pct=Math.round(item.score*100);return `<article class="recommend-card"><span class="recommend-rank">0${i+2} · NEXT PICK</span><h3 class="recommend-name">${esc(nameOf(s))}</h3><div class="tags"><span class="tag">${esc(s.버튜버여부||'스트리머')}</span><span class="tag">${esc(s['주력/종합게임']||'종합 방송')}</span></div><p class="recommend-feature">${esc(s.특징||'당신의 취향과 잘 맞는 스트리머')}</p><span class="match-percent">MATCH ${pct}%</span></article>`;}

/** 최종 추천 1명과 추가 추천, 취향 차트를 렌더링합니다. */
function renderResult(){
  setScene('LIVE 매칭 완료');const {vector}=buildUserVector(), results=recommendations(), winner=results[0];
  if(!winner){app.innerHTML='<section class="screen"><div class="error-box"><h2>추천 후보를 찾지 못했어요</h2><p class="screen-desc">조건을 바꾸거나 데이터를 확인한 뒤 다시 시도해주세요.</p><button class="primary-btn" id="reset">처음부터 다시</button></div></section>';document.querySelector('#reset').onclick=reset;return;}
  const s=winner.s,pct=Math.round(winner.score*100);
  app.innerHTML=`<section class="screen result-screen"><div class="result-header"><div><div class="eyebrow">Your streaming taste</div><h2 class="result-type">${esc(typeName(vector))}</h2><p class="screen-desc">당신의 취향 데이터를 기반으로 가장 가까운 방송을 찾았습니다.</p></div><span class="match-stamp">● LIVE 매칭 완료</span></div><div class="result-main"><div class="radar-card">${radarSvg(vector)}</div><article class="winner-card"><span class="rank-label">BEST MATCH · 가장 잘 맞는 스트리머</span><h3 class="winner-name">${esc(nameOf(s))}</h3><span class="category">${esc(s['주력/종합게임']||'종합 방송')}</span><div class="score-ring" style="--score:${pct}%"><span>${pct}%</span></div><p class="winner-feature">${esc(s.특징||'당신의 취향과 가장 가까운 방송입니다.')}</p><p class="reason"><strong>왜 추천했나요?</strong><br>${reasonFor(s,vector)}</p></article></div><h3 class="recommend-title">다음 방송도 둘러보세요 · 추가 추천</h3><div class="recommend-grid">${results.slice(1).map(resultCard).join('')}</div><div class="action-row"><button class="primary-btn" id="reset">테스트 다시하기</button><button class="secondary-btn" id="copy">결과 이름 복사</button></div></section>`;
  document.querySelector('#reset').onclick=reset;document.querySelector('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(`${typeName(vector)} · 추천 스트리머 ${nameOf(s)}`);announce('결과를 클립보드에 복사했어요.');}catch{announce(`추천 결과: ${nameOf(s)}`);}};
  addChat('매칭봇',`${nameOf(s)}님과 ${pct}% 매칭!`,true);
}
function reset(){state={scene:'start',includeVtuber:true,favorite:'',answers:[]};saveState();render();announce('새 테스트를 준비했어요.');}

window.addEventListener('pageshow',()=>{lock=false;});
init();
