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

const results = vm.runInContext(`
  streamers = __streamers;
  relationshipGraph = buildRelationshipGraph(streamers);
  state = { scene: 'result', includeVtuber: true, favorite: '', answers: [0, 0, 1, 0, 1, 0, 2, 0, 0, 1, 0, 1] };
  recommendations();
`, context);
assert.equal(results.length, 5);
assert.ok(results.every(item => item.s && Number.isFinite(item.score)));
assert.ok(results.slice(1).every(item => item.winnerRelationDepth >= 1 && item.winnerRelationDepth <= 3), 'next picks should prioritize the winner relationship graph');

const neighborhood = vm.runInContext("relationshipNeighborhood('한동숙', 3)", context);
assert.ok(neighborhood.size > 0);
assert.ok([...neighborhood.values()].every(item => item.depth <= 3));

const filteredResults = vm.runInContext(`
  state.includeVtuber = false;
  recommendations();
`, context);
assert.ok(filteredResults.length > 0);
assert.ok(filteredResults.every(item => item.s['버튜버여부'] !== '버튜버'));

console.log('recommendation vector and scoring checks passed');
