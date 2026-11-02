const test = require('node:test');
const assert = require('node:assert/strict');
const game = require('../src/game.js');
test('surviving clicks increase run, best and lifetime', () => {
  const { state, event } = game.tap(game.restore(null), () => 0.9);
  assert.equal(event, 'tap');
  assert.deepEqual(state, { run: 1, best: 1, lifetime: 1, deaths: 0, status: 'alive' });
});
test('explosion resets run, preserves record, counts the attempted click and blocks further taps', () => {
  const result = game.tap(game.restore({ run: 19, best: 30, lifetime: 90 }), () => game.EXPLOSION_CHANCE / 2);
  assert.equal(result.lost, 19);
  assert.deepEqual(result.state, { run: 0, best: 30, lifetime: 91, deaths: 1, status: 'dead' });
  assert.equal(game.tap(result.state, () => 0.9).event, 'ignored');
  assert.deepEqual(game.restart(result.state), { ...result.state, status: 'alive' });
});
test('explosion threshold is independent and includes no safe final click', () => {
  assert.equal(game.tap(game.restore(null), () => game.EXPLOSION_CHANCE / 2).event, 'boom');
  assert.equal(game.tap(game.restore(null), () => game.EXPLOSION_CHANCE).event, 'tap');
  assert.equal(game.tap(game.restore({ run: game.GOAL - 1 }), () => 0).event, 'boom');
});
test('50,000-click finish probability is one in five million', () => {
  assert.equal(game.GOAL, 50000);
  assert.equal(game.FINISH_ODDS, 5000000);
  const probability = Math.exp(game.GOAL * Math.log1p(-game.EXPLOSION_CHANCE));
  assert.ok(Math.abs(probability * game.FINISH_ODDS - 1) < 1e-12);
});
test('50,000th surviving click wins and stops the run', () => {
  const { state, event } = game.tap(game.restore({ run: game.GOAL - 1 }), () => 0.5);
  assert.equal(event, 'win');
  assert.equal(state.best, game.GOAL);
  assert.equal(game.tap(state).event, 'ignored');
});
test('saved dead and active runs restore and malformed numbers are rejected', () => {
  assert.equal(game.restore({ status: 'dead', best: 42 }).status, 'dead');
  assert.equal(game.restore({ run: 12 }).run, 12);
  assert.equal(game.restore({ run: -4, best: 'bad', lifetime: Infinity }).run, 0);
});
