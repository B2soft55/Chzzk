'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

// Browser-only rendering is stubbed so the real recommendation functions can be
// exercised against the production JSON without starting a browser.
const element = {
  textContent: '',
  innerHTML: '',
  children: [],
  append() {},
  classList: { add() {}, remove() {} },
};
const context = vm.createContext({
  console,
  __streamers: JSON.parse(fs.readFileSync('data/streamers.json', 'utf8')),
  document: { querySelector: () => element, createElement: () => ({ ...element }) },
  window: { addEventListener() {}, scrollTo() {} },
  sessionStorage: { getItem: () => null, setItem() {} },
  fetch: () => new Promise(() => {}),
  setTimeout: () => 0,
});

vm.runInContext(fs.readFileSync('src/main.js', 'utf8'), context);

const vector = vm.runInContext('streamerVector(__streamers[0])', context);
assert.deepEqual(Object.keys(vector), [
  'spicy', 'energy', 'chat', 'daytime', 'evening', 'latenight', 'otaku', 'collab', 'skill',
]);
assert.equal(vector.evening, 4, '0~1 time ratios should normalize to 0~5');
assert.ok(Object.values(vector).every(Number.isFinite), 'every vector value should be finite');

assert.equal(vm.runInContext('QUESTIONS.length', context), 12, 'quiz should contain 12 questions');
assert.equal(vm.runInContext("QUESTIONS[10].a[0][0]", context), '상관없음', 'main-game question should start with no preference');
assert.equal(vm.runInContext("typeof capturedResultBlob", context), 'function', 'full result capture should be available');
assert.equal(vm.runInContext("typeof fallbackResultCanvas", context), 'function', 'canvas fallback should be available for incompatible browsers');
assert.equal(vm.runInContext("typeof downloadImage", context), 'function', 'generated image should have a dedicated download helper');

const results = vm.runInContext(`
  streamers = __streamers;
  relationshipGraph = buildRelationshipGraph(streamers);
  state = { scene: 'result', includeVtuber: true, favorite: '', answers: [0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 0, 1] };
  recommendations();
`, context);
assert.equal(results.length, 5);
assert.ok(results.every(item => item.s && Number.isFinite(item.score)));
assert.ok(results.slice(1).every(item => !item.winnerRelationDepth || item.winnerRelationDepth <= 2), 'next picks must not use relationships beyond depth two');
assert.ok(results.slice(1).filter(item => item.winnerRelationDepth === 1).length >= 3, 'similar next picks should usually come from direct relationships');
assert.ok(results.slice(1).some(item => item.nextScore > item.rankScore), 'BEST relationship bonuses should still apply when no favorite is selected');

const neighborhood = vm.runInContext("relationshipNeighborhood('한동숙', 3)", context);
assert.ok(neighborhood.size > 0);
assert.ok([...neighborhood.values()].every(item => item.depth <= 2), 'even an explicit larger depth must be capped at two');
const directRelationship = vm.runInContext(`
  relationshipGraph = new Map([
    ['A', new Map([['B', .6], ['C', .99]])],
    ['B', new Map([['A', .6], ['C', .99]])],
    ['C', new Map([['A', .99], ['B', .99]])],
  ]);
  relationshipNeighborhood('A').get('B');
`, context);
assert.equal(directRelationship.depth, 1, 'a stronger indirect path must not replace a direct relationship');
assert.ok(
  vm.runInContext("relationshipRankScore(.8, { depth: 1, closeness: .7 }) > relationshipRankScore(.9, { depth: 2, closeness: .7 })", context),
  'a similar depth-one candidate should outrank a slightly stronger depth-two candidate',
);
assert.equal(vm.runInContext("relationshipRankScore(.8, { depth: 3, closeness: 1 })", context), .8, 'depth-three relationships must add no ranking bonus');
assert.ok(
  vm.runInContext("relationshipRankScore(.8, { depth: 1, closeness: .6 }, FAVORITE_RELATION_MULTIPLIER) > relationshipRankScore(.8, { depth: 1, closeness: .99 })", context),
  'a direct favorite relationship should outrank a direct BEST relationship',
);

const favoritePriorityResults = vm.runInContext(`
  relationshipGraph = buildRelationshipGraph(streamers);
  state = { scene: 'result', includeVtuber: true, favorite: '한동숙', answers: [0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 0, 0] };
  recommendations();
`, context);
assert.ok(favoritePriorityResults.slice(1).every(item => item.relationDepth === 1), 'next picks should prioritize direct favorite relationships when a favorite is selected');
assert.ok(favoritePriorityResults.slice(1).every(item => item.nextScore === item.rankScore), 'BEST relationship bonuses must not reorder next picks when a favorite is selected');
context.favoritePriorityItem = favoritePriorityResults[1];
assert.match(vm.runInContext("resultCard(favoritePriorityItem, 0)", context), /최애와 관계 1단계/, 'result cards should explain favorite relationship priority');

const filteredResults = vm.runInContext(`
  relationshipGraph = buildRelationshipGraph(streamers);
  state.includeVtuber = false;
  recommendations();
`, context);
assert.ok(filteredResults.length > 0);
assert.ok(filteredResults.every(item => item.s['버튜버여부'] !== '버튜버'));

console.log('recommendation vector and scoring checks passed');
