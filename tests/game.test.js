const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../src/game.js');
test('surviving clicks increase run, best and lifetime', () => {
  const { state, event } = game.tap(game.restore(null), () => 0.9);
  assert.equal(event, 'tap');
  assert.deepEqual(state, { run: 1, best: 1, lifetime: 1, deaths: 0, status: 'alive' });
});
test('explosion resets run, preserves record, counts the attempted click and blocks further taps', () => {
  const result = game.tap(game.restore({ run: 19, best: 30, lifetime: 90 }), () => 0.049);
  assert.equal(result.lost, 19);
  assert.deepEqual(result.state, { run: 0, best: 30, lifetime: 91, deaths: 1, status: 'dead' });
  assert.equal(game.tap(result.state, () => 0.9).event, 'ignored');
  assert.deepEqual(game.restart(result.state), { ...result.state, status: 'alive' });
});
test('exactly one of twenty equal random buckets explodes', () => {
  const events = Array.from({ length: 20 }, (_, i) => game.tap(game.restore(null), () => i / 20).event);
  assert.equal(events.filter(event => event === 'boom').length, 1);
});
test('millionth surviving click wins and stops the run', () => {
  const { state, event } = game.tap(game.restore({ run: 999999 }), () => 0.5);
  assert.equal(event, 'win');
  assert.equal(state.best, 1000000);
  assert.equal(game.tap(state).event, 'ignored');
});
test('saved dead and active runs restore and malformed numbers are rejected', () => {
  assert.equal(game.restore({ status: 'dead', best: 42 }).status, 'dead');
  assert.equal(game.restore({ run: 12 }).run, 12);
  assert.equal(game.restore({ run: -4, best: 'bad', lifetime: Infinity }).run, 0);
});
