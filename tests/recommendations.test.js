'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Browser-only rendering is stubbed so production recommendation functions can run in Node.
const element = { textContent: '', innerHTML: '', children: [], append() {}, classList: { add() {}, remove() {} } };
const context = vm.createContext({
  console,
  __data: JSON.parse(fs.readFileSync('data/streamers.json', 'utf8')),
  document: { querySelector: () => element, createElement: () => ({ ...element }) },
  window: { addEventListener() {}, scrollTo() {} },
  sessionStorage: { getItem: () => null, setItem() {} },
  fetch: () => new Promise(() => {}),
  setTimeout: () => 0,
});
vm.runInContext(fs.readFileSync('src/main.js', 'utf8'), context);
vm.runInContext('globalThis.__streamers = normalizeStreamerData(__data)', context);

const runRecommendations = (answers, options = {}) => {
  context.testAnswers = answers;
  context.testOptions = options;
  return vm.runInContext(`
    streamers = __streamers;
    relationshipGraph = buildRelationshipGraph(streamers);
    state = { scene: 'result', includeVtuber: testOptions.includeVtuber !== false, favorite: testOptions.favorite || '', answers: testAnswers };
    recommendations();
  `, context);
};
const baseAnswers = [0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 0, 3, 0, 0];

const normalized = vm.runInContext('__streamers', context);
const axisFields = ['매운맛', '텐션', '채팅속도', '낮비중', '저녁비중', '새벽비중', '덕후지수', '합방비중', '실력지수'];
assert.ok(Array.isArray(normalized), 'normalized graph data should be an array');
assert.equal(normalized.length, context.__data.nodes.length, 'normalized length should match nodes length');
assert.ok(normalized.every(item => item.정제된이름 && item.버튜버여부 && item['주력/종합게임'] && item.특징), 'normalized streamers should have compatibility display fields');
assert.ok(normalized.every(item => axisFields.every(field => Number.isFinite(item[field]) && item[field] >= 0 && item[field] <= 5)), 'normalized streamers should have safe 0~5 numeric axes');
assert.ok(normalized.some(item => item.연결관계.length), 'graph edges should become streamer relationships');
assert.ok(vm.runInContext('buildRelationshipGraph(__streamers).get("한동숙").size > 0', context), 'normalized edges should populate the relationship graph');

context.arrayFixture = [{ 정제된이름: '배열형', 버튜버여부: '캠방', '주력/종합게임': '종합 게임', 특징: '기존 데이터', 연결관계: [] }];
assert.equal(vm.runInContext('normalizeStreamerData(arrayFixture)[0].정제된이름', context), '배열형', 'legacy array data should normalize without losing its name');
const graphFixture = { metadata: { edge_mode: 'undirected_deduplicated' }, nodes: [
  { id: 1, name: '그래프 캠방', content_tags: ['합방', '저녁방'], recommendation_pool: ['collab'] },
  { id: 2, name: '그래프 버튜버', content_tags: ['버튜버', '서브컬처'] },
  { id: 3, name: '그래프 공식', official_channel: true },
  { id: 4, name: '후보 A' }, { id: 5, name: '후보 B' }, { id: 6, name: '후보 C' }, { id: 7, name: '후보 D' }
], edges: [{ from_id: 1, to_id: 2, weight: 1.7 }, { nodes: [1, 2], closeness: .4 }] };
context.graphFixture = graphFixture;
const fixtureNormalized = vm.runInContext('normalizeStreamerData(graphFixture)', context);
assert.equal(fixtureNormalized.length, graphFixture.nodes.length, 'graph fixture should normalize every node');
assert.equal(fixtureNormalized[0].연결관계[0].밀접도, 1, 'edge closeness should clamp and duplicate edges should keep the strongest value');
assert.ok(fixtureNormalized[1].연결관계.some(edge => edge.정제된이름 === '그래프 캠방'), 'undirected graph edges should restore both directions');
assert.ok(vm.runInContext('isOfficial(normalizeStreamerData(graphFixture)[2])', context), 'official graph nodes should be recognized');

const vector = vm.runInContext('streamerVector(__streamers[0])', context);
assert.deepEqual(Object.keys(vector), ['spicy', 'energy', 'chat', 'daytime', 'evening', 'latenight', 'otaku', 'collab', 'skill']);
assert.equal(vector.evening, normalized[0].저녁비중*5, '0~1 time ratios should normalize to 0~5');
assert.ok(Object.values(vector).every(Number.isFinite), 'every vector value should be finite');

assert.equal(vm.runInContext('QUESTIONS.length', context), 14, 'quiz should contain 14 questions');
assert.equal(vm.runInContext("QUESTIONS[10].a[0][0]", context), '상관없음', 'main-content question should start with no preference');
assert.ok(vm.runInContext('QUESTIONS[10].a.length >= 8', context), 'main-content question should offer at least eight choices');
assert.ok(vm.runInContext("QUESTIONS[11].a.some(([,meta]) => Number.isFinite(meta.exploreWeight) || Number.isFinite(meta.longtailWeight))", context), 'last question should include diversity weights');
assert.ok(vm.runInContext("state={answers:[0],favorite:'',includeVtuber:true}; const p=buildUserVector(); Number.isFinite(p.favoriteWeight)&&Number.isFinite(p.relationWeight)&&Number.isFinite(p.exploreWeight)&&Number.isFinite(p.longtailWeight)", context), 'missing new weights should fall back safely');
assert.equal(vm.runInContext("typeof capturedResultBlob", context), 'function');
assert.equal(vm.runInContext("typeof fallbackResultCanvas", context), 'function');
assert.equal(vm.runInContext("typeof downloadImage", context), 'function');

const results = runRecommendations(baseAnswers);
assert.equal(results.length, 5, 'a sufficiently large pool should return five recommendations');
assert.ok(results.length <= 5, 'recommendations should never exceed five');
assert.equal(results.map(item => item.slotRole).join(','), 'best,relation,content,taste,discovery', 'five slots should have distinct roles');
assert.ok(results.every(item => item.s && Number.isFinite(item.score)));
assert.ok(results.slice(1).every(item => !item.winnerRelationDepth || item.winnerRelationDepth <= 2));
assert.match(vm.runInContext('resultCard(recommendations()[4], 3)', context), /DISCOVERY/, 'result card should identify the discovery slot');

const neighborhood = vm.runInContext("relationshipNeighborhood('한동숙', 3)", context);
assert.ok(neighborhood.size > 0);
assert.ok([...neighborhood.values()].every(item => item.depth <= 2));
assert.equal(vm.runInContext(`relationshipGraph = new Map([['A', new Map([['B', .6], ['C', .99]])],['B', new Map([['A', .6], ['C', .99]])],['C', new Map([['A', .99], ['B', .99]])]]); relationshipNeighborhood('A').get('B').depth;`, context), 1);
assert.ok(vm.runInContext("relationshipRankScore(.8, { depth: 1, closeness: .7 }) > relationshipRankScore(.9, { depth: 2, closeness: .7 })", context));
assert.equal(vm.runInContext("relationshipRankScore(.8, { depth: 3, closeness: 1 })", context), .8);

const filteredResults = runRecommendations(baseAnswers, { includeVtuber: false });
assert.ok(filteredResults.length > 0);
assert.ok(filteredResults.every(item => item.s['버튜버여부'] !== '버튜버'), 'excluded vtubers must not appear in any slot');
context.resultItems = results;
assert.ok(vm.runInContext('resultItems.every(item => !isOfficial(item.s))', context), 'official channels must not appear in recommendations');
assert.ok(vm.runInContext("isOfficial({ 정제된이름: '개인방송', 공식채널여부: true }) && isOfficial({ name: '개인방송', official_channel: true }) && isOfficial({ 정제된이름: '개인방송', 버튜버여부: '공식' }) && isOfficial({ 정제된이름: 'LCK 공식' }) && isOfficial({ 정제된이름: '개인방송', 규모티어: 'official' }) && isOfficial({ name: '개인방송', scale_tier: 'official' })", context), 'all official-channel signals should be recognized');

const sameResults = runRecommendations(baseAnswers).map(item => item.s.정제된이름);
assert.deepEqual(runRecommendations(baseAnswers).map(item => item.s.정제된이름), sameResults, 'the same state should be reproducible');
const alternateResults = runRecommendations([1, 1, 2, 1, 2, 1, 1, 1, 1, 2, 8, 3, 0, 0]);
assert.notEqual(alternateResults[4].s.정제된이름, results[4].s.정제된이름, 'a different answer signature can rotate the discovery slot');

const talkStyleResults = runRecommendations([0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 0, 3, 1, 2]);
const skillStyleResults = runRecommendations([0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 0, 3, 3, 5]);
assert.notDeepEqual(talkStyleResults.map(item => item.s.정제된이름), skillStyleResults.map(item => item.s.정제된이름), 'new style choices should diversify recommendation results');
assert.ok(talkStyleResults.some(item => item.s.콘텐츠태그.includes('토크') || item.s.추천풀.includes('talk')), 'talk-style choices should surface matching data tags or pools');
assert.ok(skillStyleResults.some(item => item.s.콘텐츠태그.includes('실력') || item.s.추천풀.includes('skill')), 'skill-style choices should surface matching data tags or pools');
assert.ok(vm.runInContext("state={answers:[0,0,0,0,0,0,0,0,0,0,0,0,1,2],favorite:'',includeVtuber:true}; buildUserVector().preferenceKeywords.includes('토크') && buildUserVector().preferenceKeywords.includes('hidden_gem')", context), 'both new questions should merge their preference keywords');

assert.ok(vm.runInContext("gamePreferenceScore({ '주력/종합게임': '', 콘텐츠태그: ['힐링 토크'] }, ['힐링']) === 1 && gamePreferenceScore({ content_tags: ['발로란트'] }, ['발로란트']) === 1", context), 'Korean and graph content tags should affect content matching');
const emptyRelationDiscovery = vm.runInContext("state={answers:[0],favorite:'',includeVtuber:true}; discoveryPick([{s:{정제된이름:'관계없음',연결관계:[],규모티어:'longtail'},score:.8}],new Set(),.85,{exploreWeight:.5,longtailWeight:.5})", context);
assert.equal(emptyRelationDiscovery.s.정제된이름, '관계없음', 'a candidate without relationships can enter the discovery pool');

console.log('recommendation coverage and scoring checks passed');
