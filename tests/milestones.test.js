const test = require('node:test');
const assert = require('node:assert/strict');
const catalog = require('../content/milestones.json');
const milestones = require('../src/milestones.js');
test('catalog has exactly 50 numbers and 500 distinct, nonempty reactions', () => {
  assert.equal(Object.keys(catalog).length, 50);
  for (const [number, lines] of Object.entries(catalog)) {
    assert.ok(Number.isSafeInteger(Number(number)) && Number(number) > 0);
    assert.equal(lines.length, 10);
    assert.ok(lines.every(line => typeof line === 'string' && line.trim().length));
  }
  assert.equal(new Set(Object.values(catalog).flat()).size, 500);
  for (const number of [7, 10, 13, 69, 100, 420, 666, 777, 1000, 50000]) assert.ok(catalog[number]);
});
test('low milestones speak in exactly one of ten equal probability buckets through 1000', () => {
  for (const number of Object.keys(catalog).map(Number).filter(n => n <= 1000)) {
    const results = Array.from({ length: 10 }, (_, i) => milestones.select(catalog, number, {}, () => (i + 0.5) / 10));
    assert.equal(results.filter(Boolean).length, 1);
  }
});
test('higher milestones always have a reaction and all ten variants can be selected', () => {
  const selected = Array.from({ length: 10 }, (_, i) => milestones.select(catalog, 1024, {}, () => (i + 0.5) / 10));
  assert.equal(new Set(selected.map(item => item.index)).size, 10);
  assert.ok(milestones.select(catalog, 50000, {}, () => 0.99));
});
test('last spoken variant is excluded even across runs and restored saves', () => {
  const recent = milestones.restore(catalog, { 777: 0, 100: 9, 42: -1, 13: 'bad', 999: 99 });
  assert.deepEqual(recent, { 100: 9, 777: 0 });
  assert.equal(milestones.select(catalog, 777, recent, () => 0).index, 1);
  assert.equal(milestones.select(catalog, 100, recent, () => 0).index, 0);
  assert.deepEqual(milestones.restore(catalog, null), {});
  assert.equal(milestones.select(catalog, 8), null);
});

test('1000 is included in the 10% gate; higher milestones remain eligible', () => {
  assert.equal(milestones.LOW_NUMBER_CHANCE, 0.1);
  assert.equal(milestones.LOW_NUMBER_MAX, 1000);
  assert.ok(milestones.select(catalog, 1000, {}, () => 0.099999));
  assert.equal(milestones.select(catalog, 1000, {}, () => 0.1), null);
  for (const number of Object.keys(catalog).map(Number).filter(n => n > 1000)) {
    assert.ok(milestones.select(catalog, number, {}, () => 0.99));
  }
});
