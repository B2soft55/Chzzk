'use strict';

const AXES = ['spicy','energy','chat','daytime','evening','latenight','otaku','collab','skill'];
const FIELD_MAP = {spicy:'매운맛',energy:'텐션',chat:'채팅속도',daytime:'낮비중',evening:'저녁비중',latenight:'새벽비중',otaku:'덕후지수',collab:'합방비중',skill:'실력지수'};
const OFFICIAL_WORDS = ['공식','뉴스','live','중계','치지직','jtbc','spotv','lck','pubg','발로란트'];
const INCLUDE_DULLAHAN_WHEN_EXCLUDING_VTUBERS = true; // TODO: 듀라한도 제외하려면 false로 변경하세요.
const SAVE_KEY = 'stream-match-state-v2';
const RELATION_MAX_DEPTH = 2;
const RELATION_BONUS_BY_DEPTH = {1:.32,2:.06};
const FAVORITE_RELATION_MULTIPLIER = 2;
const SIMILAR_TAG_RELATION_BONUS = .045;
const DISCOVERY_MIN_SCORE = .58;
const DEFAULT_RECOMMENDATION_WEIGHTS = {favoriteWeight:.3,relationWeight:.2,exploreWeight:.15,longtailWeight:.1};

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
  {q:'오래 보게 되는 콘텐츠 스타일은?', a:[['한 게임을 깊게 파는 장인 방송',{skill:5,energy:2}],['매일 새로운 걸 만나는 종합 게임',{energy:4,otaku:3}],['사람들과 만드는 대형 합방·서버',{collab:5,chat:4}],['게임보다 토크와 소통이 중심',{chat:5,spicy:3}]]},
  {q:'추천 스트리머의 주력 콘텐츠는?', a:[['상관없음',{gameKeywords:[]}],['종합 게임 · 스토리',{gameKeywords:['종합 게임','종겜','스토리','콘솔','인디']}],['LoL · TFT · AOS',{gameKeywords:['lol','tft','리그 오브 레전드','aos']}],['마크 · 대형 서버',{gameKeywords:['마인크래프트','마크','서버']}],['FPS · 오버워치 · 발로',{gameKeywords:['fps','오버워치','발로란트','배틀그라운드']}],['서브컬처 · 버튜버',{gameKeywords:['서브컬처','버튜버','오타쿠']}],['스포츠 · 격투 · 레이싱',{gameKeywords:['스포츠','축구','야구','격투','레이싱']}],['라디오 · 토크 · 힐링',{gameKeywords:['라디오','토크','소통','힐링']}],['대회 · e스포츠 · 분석',{gameKeywords:['대회','e스포츠','이스포츠','분석','해설']}]]},
  {q:'게임 장르 외에 끌리는 방송 스타일은?', a:[['상관없음',{preferenceKeywords:[]}],['토크 · 라디오 · 힐링',{preferenceKeywords:['토크','talk','라디오','radio','힐링','calm']}],['합방 · 크루 · 대형 서버',{preferenceKeywords:['합방','collab','크루','대형서버']}],['실력 · 분석 · e스포츠',{preferenceKeywords:['실력','skill','분석','e스포츠','esports']}],['매운맛 · 하이텐션',{preferenceKeywords:['매운맛','spicy','하이텐션','high_energy']}],['음악 · 노래 방송',{preferenceKeywords:['음악','노래']}]]},
  {q:'새 최애를 찾을 때 가장 기대하는 매력은?', a:[['상관없음',{preferenceKeywords:[]}],['검증된 대표 방송',{preferenceKeywords:['best_match','major']}],['아직 덜 알려진 숨은 보석',{preferenceKeywords:['hidden_gem','longtail']}],['세계관과 덕질할 거리',{preferenceKeywords:['otaku','서브컬처','버튜버']}],['스토리에 몰입하는 방송',{preferenceKeywords:['story','스토리게임']}],['한 게임을 깊게 파는 장인',{preferenceKeywords:['skill','실력','분석']}]]},
  {q:'추천 결과를 어떻게 구성할까요?', a:[['가장 정확한 BEST 중심',{favoriteWeight:.3,relationWeight:.12,exploreWeight:.05,longtailWeight:.02}],['최애 관계를 우선해서',{favoriteWeight:.45,relationWeight:.45,exploreWeight:.08,longtailWeight:.03}],['취향 맞는 덜 뻔한 사람',{favoriteWeight:.18,relationWeight:.12,exploreWeight:.45,longtailWeight:.2}],['숨은 보석까지 섞어서',{favoriteWeight:.12,relationWeight:.08,exploreWeight:.55,longtailWeight:.5}]]}
];

const CHAT_POOL = [
  ['초록괴물','오 성향 테스트 뭐임?'],['도파민수급중','나랑 찰떡 누구 나올지 궁금하다'],['새벽3시출석','ㅋㅋㅋㅋ 매운맛 선택 간다'],['방구석분석가','데이터 598명 실화냐'],['클립중독','이거 결과 공유해야지'],['평범한시청자','디자인 방송 같아서 좋네'],['치즈볼','추천 맛집 입장했습니다'],['과몰입금지','최애 고르면 더 정확한가 봄']
];

let streamers = [];
let relationshipGraph = new Map();
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
function nameOf(s){return String(s?.정제된이름||s?.name||'이름 미상').trim()||'이름 미상';}
function stringList(value){return Array.isArray(value)?value.filter(x=>x!==null&&x!==undefined).map(x=>String(x).trim()).filter(Boolean):[];}
function contentLabel(tags=[]){
  const values=stringList(tags),lower=values.map(tag=>tag.toLowerCase()),has=(...words)=>words.some(word=>lower.some(tag=>tag.includes(word.toLowerCase())));
  if(has('lol','aos','tft','리그 오브 레전드'))return 'LoL / TFT / AOS';
  if(has('마인크래프트','마크','대형서버'))return '마인크래프트 / 대형서버';
  if(has('fps','발로란트','오버워치','배틀그라운드'))return 'FPS';
  if(has('서브컬처','버튜버'))return '서브컬처 / 종합 게임';
  if(has('스포츠'))return '스포츠 / 종합 게임';
  return '종합 게임';
}
function inferredFeature(s,tags,pools){
  if(s?.특징)return String(s.특징);const highlights=[...tags,...pools].filter((value,index,list)=>list.indexOf(value)===index).slice(0,3);
  return `${highlights.length?highlights.join(', '):'종합게임'} 성향이 두드러지는 스트리머${s?.data_note||s?.데이터메모?` · ${s?.data_note||s?.데이터메모}`:''}`;
}
function normalizedMetrics(s,tags,pools){
  const signals=[...tags,...pools].map(value=>value.toLowerCase()),has=(...words)=>words.some(word=>signals.some(value=>value.includes(word.toLowerCase()))),metrics={
    매운맛:num(s?.매운맛,2.5),텐션:num(s?.텐션,3),채팅속도:num(s?.채팅속도,2.5),낮비중:num(s?.낮비중,.2),저녁비중:num(s?.저녁비중,.6),새벽비중:num(s?.새벽비중,.2),덕후지수:num(s?.덕후지수,2.5),합방비중:num(s?.합방비중,2),실력지수:num(s?.실력지수,2.5)
  };
  const missing=field=>s?.[field]===undefined||s?.[field]===null||s?.[field]==='',set=(field,value)=>{if(missing(field))metrics[field]=value;},setTimes=values=>Object.entries(values).forEach(([field,value])=>set(field,value));
  if(has('spicy','매운맛'))set('매운맛',4);if(has('high_energy','하이텐션'))set('텐션',4.2);if(has('talk','토크'))set('채팅속도',3.5);
  if(has('calm','radio','힐링','라디오')){set('매운맛',1.5);set('텐션',2.5);}if(has('otaku','서브컬처','버튜버'))set('덕후지수',4.3);
  if(has('collab','합방','크루'))set('합방비중',4);if(has('skill','실력','분석','e스포츠'))set('실력지수',4);
  if(has('낮방'))setTimes({낮비중:.6,저녁비중:.3,새벽비중:.1});else if(has('저녁방'))setTimes({낮비중:.1,저녁비중:.7,새벽비중:.2});else if(has('새벽방'))setTimes({낮비중:.1,저녁비중:.3,새벽비중:.6});
  return metrics;
}
function normalizeStreamer(s,index=0){
  const source=s&&typeof s==='object'?s:{},tags=stringList(source.콘텐츠태그||source.content_tags),pools=stringList(source.추천풀||source.recommendation_pool),official=source.공식채널여부===true||source.official_channel===true,scale=source.규모티어||source.scale_tier||'';
  const type=official||scale==='official'?'공식':source.버튜버여부||(tags.some(tag=>tag==='버튜버')?'버튜버':'캠방');
  return {...source,원본순위:source.원본순위??source.id??index+1,정제된이름:nameOf(source),공식채널여부:official,규모티어:scale,콘텐츠태그:tags,추천풀:pools,데이터메모:source.데이터메모??source.data_note??'',버튜버여부:type,'주력/종합게임':source['주력/종합게임']||contentLabel(tags),특징:inferredFeature(source,tags,pools),연결관계:Array.isArray(source.연결관계)?source.연결관계:[],...normalizedMetrics(source,tags,pools)};
}
function edgeEndpoint(edge,side){
  const keys=side==='source'?['source','from','source_id','from_id','a']:['target','to','target_id','to_id','b'];let value=keys.map(key=>edge?.[key]).find(item=>item!==undefined&&item!==null);
  if(value===undefined&&Array.isArray(edge?.nodes))value=edge.nodes[side==='source'?0:1];return value&&typeof value==='object'?(value.id??value.name??value.정제된이름):value;
}
function normalizeStreamerData(data){
  if(Array.isArray(data))return data.map(normalizeStreamer);
  if(!data||typeof data!=='object'||!Array.isArray(data.nodes))throw new Error('스트리머 데이터가 배열 또는 nodes 배열을 가진 그래프가 아닙니다.');
  const items=data.nodes.map(normalizeStreamer),byId=new Map(),byName=new Map();items.forEach(item=>{byId.set(String(item.원본순위),item);byName.set(nameOf(item),item);});
  const resolve=value=>byId.get(String(value))||byName.get(String(value)),undirected=data.metadata?.edge_mode==='undirected_deduplicated';let ignored=0;
  const add=(from,to,edge)=>{const closeness=Math.max(0,Math.min(1,Number(edge?.closeness??edge?.weight??edge?.밀접도??.5)||0)),relationship=edge?.type??edge?.relationship_type??[],evidence=edge?.evidence??edge?.reason??'',entry={원본순위:to.원본순위,정제된이름:nameOf(to),밀접도:closeness,관계유형:Array.isArray(relationship)?relationship:stringList([relationship]),근거:evidence};const existing=from.연결관계.find(item=>item.정제된이름===entry.정제된이름);if(!existing)from.연결관계.push(entry);else if(closeness>Number(existing.밀접도||0))Object.assign(existing,entry);};
  (Array.isArray(data.edges)?data.edges:[]).forEach(edge=>{const from=resolve(edgeEndpoint(edge,'source')),to=resolve(edgeEndpoint(edge,'target'));if(!from||!to||from===to){ignored++;return;}add(from,to,edge);if(undirected)add(to,from,edge);});
  if(ignored)console.warn(`Ignored ${ignored} streamer edges with unresolved endpoints.`);return items;
}
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

/** JSON을 불러오고 배열형/그래프형 데이터를 정규화한 뒤 앱을 시작합니다. */
async function init(){
  seedChat();let data;
  try{
    const response=await fetch('data/streamers.json',{cache:'no-store'});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    data=await response.json();streamers=normalizeStreamerData(data).filter(item=>nameOf(item)!=='이름 미상');
    relationshipGraph=buildRelationshipGraph(streamers);
    if(!streamers.length)throw new Error('사용 가능한 스트리머가 없습니다.');
    if(state.scene==='quiz'&&state.answers.length>=QUESTIONS.length)state.scene='result';
    render();
  }catch(error){
    console.warn('Streamer data load failed:',error,{topLevelKeys:data&&typeof data==='object'?Object.keys(data):[],isArray:Array.isArray(data),nodesLength:Array.isArray(data?.nodes)?data.nodes.length:null,edgesLength:Array.isArray(data?.edges)?data.edges.length:null});
    app.innerHTML=`<section class="screen"><div class="error-box"><div class="eyebrow">LOAD ERROR</div><h2>스트리머 명단을 불러오지 못했어요</h2><p class="screen-desc">인터넷 연결을 확인하거나, 로컬에서 파일을 직접 열었다면 간단한 웹 서버로 실행해주세요.</p><button class="primary-btn" onclick="location.reload()">다시 시도</button></div></section>`;
  }
}
function render(){({start:renderStart,favorite:renderFavorite,quiz:renderQuiz,result:renderResult}[state.scene]||renderStart)();}

/** 첫 화면과 버튜버 포함 필터를 렌더링합니다. */
function renderStart(){
  setScene('성향 분석 대기실');
  app.innerHTML=`<section class="screen"><div class="eyebrow">Find your next streamer</div><h1 class="hero-title">인터넷방송<br><em>성향 테스트</em></h1><p class="subtitle">당신의 방송 취향을 분석해서 찰떡 스트리머를 추천합니다.<br>14개의 질문, 약 1분이면 충분해요.</p><div class="choice-label">추천 결과에 버튜버를 포함할까요?</div><div class="mode-options"><label class="mode-option"><input type="radio" name="vtuber" value="yes" ${state.includeVtuber?'checked':''}><span class="mode-card">버튜버 포함<small>캠방 · 듀라한 · 버튜버 모두 추천</small></span></label><label class="mode-option"><input type="radio" name="vtuber" value="no" ${!state.includeVtuber?'checked':''}><span class="mode-card">버튜버 제외<small>${INCLUDE_DULLAHAN_WHEN_EXCLUDING_VTUBERS?'캠방 · 듀라한 추천':'캠방만 추천'}</small></span></label></div><div class="action-row"><button class="primary-btn" id="start-btn">취향 분석 시작하기 →</button><span class="microcopy">현재 ${streamers.length}명의 방송 데이터 분석 준비 완료</span></div><div class="donation"><strong>₩ 10,000 취향저격님</strong><p>제 다음 최애를 찾아주세요!<br>매운맛에 새벽방송 좋아합니다</p></div></section>`;
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
    box.innerHTML=matches.map((s,i)=>`<button class="suggestion" data-i="${i}">${esc(nameOf(s))}<small>${esc(s['주력/종합게임']||contentLabel(s?.콘텐츠태그||s?.content_tags)||'종합 방송')}</small></button>`).join('');box.hidden=false;
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
  const totals=Object.fromEntries(AXES.map(k=>[k,0])), counts=Object.fromEntries(AXES.map(k=>[k,0])), weights={...DEFAULT_RECOMMENDATION_WEIGHTS};let gameKeywords=[],preferenceKeywords=[];
  state.answers.forEach((answer,i)=>{const vector=QUESTIONS[i]?.a?.[answer]?.[1]||{};AXES.forEach(k=>{if(Number.isFinite(vector[k])){totals[k]+=vector[k];counts[k]++;}});Object.keys(weights).forEach(k=>{if(Number.isFinite(vector[k]))weights[k]=vector[k];});if(Array.isArray(vector.gameKeywords))gameKeywords=vector.gameKeywords;if(Array.isArray(vector.preferenceKeywords))preferenceKeywords.push(...vector.preferenceKeywords);});
  return {vector:Object.fromEntries(AXES.map(k=>[k,counts[k]?totals[k]/counts[k]:2.5])),gameKeywords,preferenceKeywords:[...new Set(preferenceKeywords)],...weights};
}
/** 데이터의 시간대 비율(0~1)과 일반 지표(0~5)를 동일 범위로 정규화합니다. */
function streamerVector(s){
  return Object.fromEntries(AXES.map(k=>{
    const raw=num(s?.[FIELD_MAP[k]]);
    const normalized=['daytime','evening','latenight'].includes(k)&&raw<=1?raw*5:raw;
    return [k,normalized];
  }));
}
function cosine(a,b){let dot=0,aa=0,bb=0;AXES.forEach(k=>{dot+=a[k]*b[k];aa+=a[k]**2;bb+=b[k]**2;});return aa&&bb?dot/(Math.sqrt(aa)*Math.sqrt(bb)):0;}
function distanceScore(a,b){const d=Math.sqrt(AXES.reduce((sum,k)=>sum+(a[k]-b[k])**2,0)/AXES.length);return Math.max(0,1-d/5);}
function similarity(a,b){return cosine(a,b)*.45+distanceScore(a,b)*.55;}
function isOfficial(s){const n=nameOf(s).toLowerCase();return s?.공식채널여부===true||s?.official_channel===true||s?.버튜버여부==='공식'||s?.규모티어==='official'||s?.scale_tier==='official'||OFFICIAL_WORDS.some(word=>n.includes(word));}
function candidates(){return streamers.filter(s=>!isOfficial(s)&&nameOf(s)!==state.favorite&&(state.includeVtuber||s.버튜버여부!=='버튜버')&&(state.includeVtuber||INCLUDE_DULLAHAN_WHEN_EXCLUDING_VTUBERS||s.버튜버여부!=='듀라한'));}

/** 연결관계를 양방향 그래프로 정리해 JSON에 한쪽 방향만 있어도 탐색할 수 있게 합니다. */
function buildRelationshipGraph(items){
  const graph=new Map(items.map(s=>[nameOf(s),new Map()]));
  items.forEach(s=>(Array.isArray(s.연결관계)?s.연결관계:[]).forEach(edge=>{
    const from=nameOf(s),to=String(edge?.정제된이름||'').trim(),closeness=Math.max(0,Math.min(1,Number(edge?.밀접도)||0));
    if(!to||!graph.has(to)||from===to||!closeness)return;
    graph.get(from).set(to,Math.max(graph.get(from).get(to)||0,closeness));graph.get(to).set(from,Math.max(graph.get(to).get(from)||0,closeness));
  }));return graph;
}
/** 시작 스트리머에서 최대 2개 관계 노드까지 이어지는 경로 중 가장 강한 밀접도를 반환합니다. */
function relationshipNeighborhood(source,maxDepth=RELATION_MAX_DEPTH){
  const depthLimit=Math.min(RELATION_MAX_DEPTH,Math.max(0,maxDepth)),found=new Map(),queue=[{name:source,depth:0,closeness:1}];
  while(queue.length){const current=queue.shift();if(current.depth>=depthLimit)continue;(relationshipGraph.get(current.name)||new Map()).forEach((edge,to)=>{const next={name:to,depth:current.depth+1,closeness:current.closeness*edge};const previous=found.get(to);if(!previous||next.depth<previous.depth||(next.depth===previous.depth&&next.closeness>previous.closeness)){found.set(to,next);queue.push(next);}});}
  found.delete(source);return found;
}
function textTags(s){return [s?.['주력/종합게임'],...stringList(s?.콘텐츠태그),...stringList(s?.content_tags)].map(value=>String(value||'').toLowerCase());}
function gamePreferenceScore(s,keywords){if(!keywords.length)return null;const tags=textTags(s);return keywords.some(keyword=>tags.some(tag=>tag.includes(keyword.toLowerCase())))?1:.35;}
function preferenceScore(s,keywords){if(!keywords.length)return null;const values=[...textTags(s),...stringList(s?.추천풀),...stringList(s?.recommendation_pool),s?.규모티어,s?.scale_tier].map(value=>String(value||'').toLowerCase());return keywords.some(keyword=>values.some(value=>value.includes(String(keyword).toLowerCase())))?1:.2;}
function blendedTasteScore(test,game,preference){const parts=[[test,.7],[game,.12],[preference,.18]].filter(([value])=>value!==null);const total=parts.reduce((sum,[,weight])=>sum+weight,0);return parts.reduce((sum,[value,weight])=>sum+value*weight,0)/total;}
function recommendationPoolBonus(s,purpose){const pools=Array.isArray(s?.추천풀)?s.추천풀.map(value=>String(value).toLowerCase()):[];return pools.some(value=>value.includes(purpose)||value.includes(purpose==='discovery'?'발굴':'콘텐츠')) ? .06 : 0;}
function similarTagRelation(anchor,candidate){
  if(!anchor)return 0;const target=nameOf(candidate),source=nameOf(anchor),edges=[...(Array.isArray(anchor.유사태그관계)?anchor.유사태그관계:[]),...(Array.isArray(candidate.유사태그관계)?candidate.유사태그관계:[])];
  return edges.reduce((best,edge)=>{const edgeName=String(edge?.정제된이름||edge?.이름||'').trim();if(edgeName!==target&&edgeName!==source)return best;return Math.max(best,Math.max(0,Math.min(1,Number(edge?.밀접도)||.5)));},0);
}
/** 성향 점수가 비슷할 때 1단계 관계를 강하게, 2단계 관계를 약하게 우선합니다. */
function relationshipRankScore(score,relation,multiplier=1){return score+(relation?.closeness||0)*(RELATION_BONUS_BY_DEPTH[relation?.depth]||0)*multiplier;}
function stableHash(value){let hash=2166136261;for(let i=0;i<value.length;i++){hash^=value.charCodeAt(i);hash=Math.imul(hash,16777619);}return hash>>>0;}
function answerSignature(){return `${state.answers.join(',')}|${state.favorite||''}|${state.includeVtuber!==false}`;}
function firstUnused(items,selected){return items.find(item=>!selected.has(nameOf(item.s)));}
function discoveryPick(scored,selected,bestScore,{exploreWeight,longtailWeight}){
  const scoreFloor=Math.max(DISCOVERY_MIN_SCORE,bestScore-(.18+exploreWeight*.12)),eligible=scored.filter(item=>!selected.has(nameOf(item.s))&&item.score>=scoreFloor);if(!eligible.length)return null;
  const ordered=eligible.map(item=>{const tier=item.s?.규모티어==='longtail'?longtailWeight*.035:0;return {...item,discoveryScore:item.score+tier+recommendationPoolBonus(item.s,'discovery')*exploreWeight};}).sort((a,b)=>b.discoveryScore-a.discoveryScore||nameOf(a.s).localeCompare(nameOf(b.s)));
  const rotationPool=ordered.flatMap(item=>item.s?.규모티어==='longtail'&&longtailWeight>=.2?[item,item]:[item]),offset=stableHash(answerSignature())%rotationPool.length;return {...rotationPool[offset],slotRole:'discovery'};
}

/** BEST는 정확도를 유지하고 NEXT PICK은 관계·콘텐츠·취향·발굴 슬롯으로 분리합니다. */
function recommendations(){
  const profile=buildUserVector(),{vector,favoriteWeight,gameKeywords,preferenceKeywords,relationWeight,exploreWeight,longtailWeight}=profile,favorite=streamers.find(s=>nameOf(s)===state.favorite),favVector=favorite?streamerVector(favorite):null;
  const pool=candidates();if(!pool.length)return [];
  const fw=favVector?favoriteWeight:0,favoriteRelations=favorite?relationshipNeighborhood(nameOf(favorite)):new Map();
  const scored=pool.map(s=>{const test=similarity(vector,streamerVector(s)),game=gamePreferenceScore(s,gameKeywords),preference=preferenceScore(s,preferenceKeywords),taste=blendedTasteScore(test,game,preference),fav=favVector?similarity(favVector,streamerVector(s)):0,relation=favoriteRelations.get(nameOf(s));const score=taste*(1-fw)+fav*fw;return {s,score,testScore:test,gameScore:game,preferenceScore:preference,rankScore:relationshipRankScore(score,relation,FAVORITE_RELATION_MULTIPLIER),relationDepth:relation?.depth||null};}).sort((a,b)=>b.score-a.score||nameOf(a.s).localeCompare(nameOf(b.s)));
  if(!scored.length)return [];const winner={...scored[0],slotRole:'best'},winnerRelations=relationshipNeighborhood(nameOf(winner.s)),selected=new Set([nameOf(winner.s)]),next=[];
  const enriched=scored.slice(1).map(item=>{const relation=winnerRelations.get(nameOf(item.s)),activeRelation=favoriteRelations.size?favoriteRelations.get(nameOf(item.s)):relation,tagBonus=similarTagRelation(favorite||winner.s,item.s)*SIMILAR_TAG_RELATION_BONUS;return {...item,winnerRelationDepth:relation?.depth||null,nextScore:relationshipRankScore(item.score,activeRelation,1+relationWeight)+tagBonus};});
  const relationPick=firstUnused([...enriched].sort((a,b)=>b.nextScore-a.nextScore),selected);if(relationPick){next.push({...relationPick,slotRole:'relation'});selected.add(nameOf(relationPick.s));}
  const contentPick=firstUnused([...enriched].sort((a,b)=>(b.gameScore??0)+recommendationPoolBonus(b.s,'content')-(a.gameScore??0)-recommendationPoolBonus(a.s,'content')||b.score-a.score),selected);if(contentPick){next.push({...contentPick,slotRole:'content'});selected.add(nameOf(contentPick.s));}
  const tastePick=firstUnused(enriched,selected);if(tastePick){next.push({...tastePick,slotRole:'taste'});selected.add(nameOf(tastePick.s));}
  const discovery=discoveryPick(enriched,selected,winner.score,{exploreWeight,longtailWeight});if(discovery){next.push(discovery);selected.add(nameOf(discovery.s));}
  for(const item of enriched){if(next.length>=4)break;if(!selected.has(nameOf(item.s))){next.push({...item,slotRole:'fallback'});selected.add(nameOf(item.s));}}
  return [winner,...next.slice(0,4)];
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
function resultCard(item,i){const s=item.s,pct=Math.round(item.score*100),relation=state.favorite&&item.relationDepth?`<span class="tag relation-tag">최애와 관계 ${item.relationDepth}단계</span>`:item.winnerRelationDepth?`<span class="tag relation-tag">BEST와 관계 ${item.winnerRelationDepth}단계</span>`:'',role={relation:'RELATION',content:'CONTENT',taste:'TASTE',discovery:'DISCOVERY'}[item.slotRole]||'NEXT PICK';return `<article class="recommend-card"><span class="recommend-rank">0${i+2} · ${role}</span><h3 class="recommend-name">${esc(nameOf(s))}</h3><div class="tags"><span class="tag">${esc(s.버튜버여부||'스트리머')}</span><span class="tag">${esc(s['주력/종합게임']||contentLabel(s?.콘텐츠태그||s?.content_tags)||'종합 방송')}</span>${relation}</div><p class="recommend-feature">${esc(s.특징||'당신의 취향과 잘 맞는 스트리머')}</p><span class="match-percent">MATCH ${pct}%</span></article>`;}

/** 계산된 스타일을 복제해 외부 라이브러리 없이 결과 영역을 PNG로 저장합니다. */
function inlineComputedStyles(source,clone){
  const style=getComputedStyle(source);for(const property of style)clone.style.setProperty(property,style.getPropertyValue(property),style.getPropertyPriority(property));clone.style.animation='none';clone.style.transition='none';
  Array.from(source.children).forEach((child,i)=>inlineComputedStyles(child,clone.children[i]));
}
function canvasBlob(canvas){return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG 변환 실패')),'image/png'));}
function downloadImage(blob){
  const url=URL.createObjectURL(blob),download=document.createElement('a');download.href=url;download.download=`stream-match-${Date.now()}.png`;download.style.display='none';document.body.append(download);download.click();download.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
function wrapCanvasText(context,text,x,y,maxWidth,lineHeight,maxLines=3){
  const chars=Array.from(String(text||''));let line='',lines=[];chars.forEach(char=>{const next=line+char;if(line&&context.measureText(next).width>maxWidth){lines.push(line);line=char;}else line=next;});if(line)lines.push(line);lines.slice(0,maxLines).forEach((value,i)=>context.fillText(value+(i===maxLines-1&&lines.length>maxLines?'…':''),x,y+i*lineHeight));return Math.min(lines.length,maxLines)*lineHeight;
}
/** foreignObject를 지원하지 않는 모바일 브라우저에서도 저장할 수 있는 순수 Canvas 결과 이미지입니다. */
function fallbackResultCanvas(source){
  const canvas=document.createElement('canvas'),width=1080,pad=72,cards=Array.from(source.querySelectorAll('.recommend-card'));canvas.width=width;canvas.height=1120+cards.length*155;const context=canvas.getContext('2d');if(!context)throw new Error('Canvas를 사용할 수 없음');
  context.fillStyle='#090d0c';context.fillRect(0,0,canvas.width,canvas.height);context.fillStyle='#00ffa3';context.fillRect(0,0,canvas.width,12);context.font='800 24px system-ui, sans-serif';context.fillText('STREAM MATCH · YOUR STREAMING TASTE',pad,82);
  context.fillStyle='#fff';context.font='900 58px system-ui, sans-serif';wrapCanvasText(context,source.querySelector('.result-type')?.textContent,pad,170,width-pad*2,68,2);context.fillStyle='#9baba3';context.font='24px system-ui, sans-serif';context.fillText('당신의 취향과 가장 가까운 방송을 찾았습니다.',pad,300);
  context.fillStyle='#121a17';context.fillRect(pad,355,width-pad*2,430);context.fillStyle='#00ffa3';context.font='800 22px system-ui, sans-serif';context.fillText('BEST MATCH',pad+42,410);context.fillStyle='#fff';context.font='900 72px system-ui, sans-serif';context.fillText(source.querySelector('.winner-name')?.textContent||'',pad+42,500);context.fillStyle='#ff3d75';context.font='900 54px system-ui, sans-serif';context.fillText(source.querySelector('.score-ring span')?.textContent||'',width-pad-210,500);context.fillStyle='#d7e1dc';context.font='25px system-ui, sans-serif';wrapCanvasText(context,source.querySelector('.winner-feature')?.textContent,pad+42,580,width-pad*2-84,38,3);context.fillStyle='#9baba3';context.font='22px system-ui, sans-serif';wrapCanvasText(context,source.querySelector('.reason')?.textContent,pad+42,690,width-pad*2-84,34,3);
  context.fillStyle='#fff';context.font='800 30px system-ui, sans-serif';context.fillText('NEXT PICKS',pad,865);cards.forEach((card,i)=>{const y=910+i*155;context.fillStyle='#121a17';context.fillRect(pad,y,width-pad*2,125);context.fillStyle='#00ffa3';context.font='800 18px system-ui, sans-serif';context.fillText(`0${i+2}`,pad+28,y+42);context.fillStyle='#fff';context.font='800 30px system-ui, sans-serif';context.fillText(card.querySelector('.recommend-name')?.textContent||'',pad+85,y+46);context.fillStyle='#9baba3';context.font='18px system-ui, sans-serif';wrapCanvasText(context,card.querySelector('.recommend-feature')?.textContent,pad+85,y+82,width-pad*2-210,25,2);context.fillStyle='#ff3d75';context.font='800 20px system-ui, sans-serif';context.fillText(card.querySelector('.match-percent')?.textContent||'',width-pad-170,y+45);});return canvas;
}
async function capturedResultBlob(source){
  const width=Math.ceil(source.scrollWidth),height=Math.ceil(source.scrollHeight),clone=source.cloneNode(true);inlineComputedStyles(source,clone);clone.querySelectorAll('[data-capture-exclude]').forEach(el=>el.remove());clone.setAttribute('xmlns','http://www.w3.org/1999/xhtml');clone.style.width=`${width}px`;clone.style.height=`${height}px`;clone.style.overflow='visible';
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(clone)}</foreignObject></svg>`,image=new Image(),url=URL.createObjectURL(new Blob([svg],{type:'image/svg+xml;charset=utf-8'}));
  try{await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(new Error('결과 화면 변환 실패'));image.src=url;});const scale=Math.min(2,12000/Math.max(width,height)),canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);const context=canvas.getContext('2d');if(!context)throw new Error('Canvas를 사용할 수 없음');context.scale(scale,scale);context.drawImage(image,0,0);return await canvasBlob(canvas);}finally{URL.revokeObjectURL(url);}
}
async function saveResultImage(){
  const source=document.querySelector('.result-screen');if(!source)return;const button=document.querySelector('#save-image');button.disabled=true;button.textContent='이미지 만드는 중…';
  try{let blob;try{blob=await capturedResultBlob(source);}catch(error){console.warn('Full result capture failed; using compatible canvas image:',error);blob=await canvasBlob(fallbackResultCanvas(source));}downloadImage(blob);announce('결과 이미지를 저장했어요.');}catch(error){console.warn('Result image save failed:',error);announce('이미지를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');}finally{button.disabled=false;button.textContent='결과 이미지 저장';}
}

/** 최종 추천 1명과 추가 추천, 취향 차트를 렌더링합니다. */
function renderResult(){
  setScene('LIVE 매칭 완료');const {vector}=buildUserVector(), results=recommendations(), winner=results[0];
  if(!winner){app.innerHTML='<section class="screen"><div class="error-box"><h2>추천 후보를 찾지 못했어요</h2><p class="screen-desc">조건을 바꾸거나 데이터를 확인한 뒤 다시 시도해주세요.</p><button class="primary-btn" id="reset">처음부터 다시</button></div></section>';document.querySelector('#reset').onclick=reset;return;}
  const s=winner.s,pct=Math.round(winner.score*100);
  app.innerHTML=`<section class="screen result-screen"><div class="result-header"><div><div class="eyebrow">Your streaming taste</div><h2 class="result-type">${esc(typeName(vector))}</h2><p class="screen-desc">당신의 취향 데이터를 기반으로 가장 가까운 방송을 찾았습니다.</p></div><span class="match-stamp">● LIVE 매칭 완료</span></div><div class="result-main"><div class="radar-card">${radarSvg(vector)}</div><article class="winner-card"><span class="rank-label">BEST MATCH · 가장 잘 맞는 스트리머</span><h3 class="winner-name">${esc(nameOf(s))}</h3><span class="category">${esc(s['주력/종합게임']||contentLabel(s?.콘텐츠태그||s?.content_tags)||'종합 방송')}</span><div class="score-ring" style="--score:${pct}%"><span>${pct}%</span></div><p class="winner-feature">${esc(s.특징||'당신의 취향과 가장 가까운 방송입니다.')}</p><p class="reason"><strong>왜 추천했나요?</strong><br>${reasonFor(s,vector)}</p></article></div><h3 class="recommend-title">다음 방송도 둘러보세요 · 추가 추천</h3><div class="recommend-grid">${results.slice(1).map(resultCard).join('')}</div><div class="action-row result-actions" data-capture-exclude><button class="primary-btn" id="save-image">결과 이미지 저장</button><button class="secondary-btn" id="copy">결과 이름 복사</button><button class="secondary-btn" id="reset">테스트 다시하기</button></div></section>`;
  document.querySelector('#reset').onclick=reset;document.querySelector('#save-image').onclick=saveResultImage;document.querySelector('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(`${typeName(vector)} · 추천 스트리머 ${nameOf(s)}`);announce('결과를 클립보드에 복사했어요.');}catch{announce(`추천 결과: ${nameOf(s)}`);}};
  addChat('매칭봇',`${nameOf(s)}님과 ${pct}% 매칭!`,true);
}
function reset(){state={scene:'start',includeVtuber:true,favorite:'',answers:[]};saveState();render();announce('새 테스트를 준비했어요.');}

window.addEventListener('pageshow',()=>{lock=false;});
init();
