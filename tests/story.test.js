const test = require('node:test');
const assert = require('node:assert/strict');
const story = require('../src/story.js');
const catalog = [{id:'moon',beats:[{text:'First'},{text:'Last'}]},{id:'other',beats:[{text:'Other'}]}];
test('first play selects randomly from the catalog at the beginning',()=>{
  assert.deepEqual(story.choose(catalog,null,()=>0),{storyId:'moon',beat:0});
  assert.deepEqual(story.choose(catalog,null,()=>0.9),{storyId:'other',beat:0});
});
test('reload restores the saved beat; only a missing bookmark starts a new story',()=>{
  const saved={storyId:'moon',beat:1};
  assert.deepEqual(story.restore(catalog,saved),saved);
  assert.deepEqual(story.restore(catalog,null,()=>0),{storyId:'moon',beat:0});
});
test('story end selects a different story when available and restarts the sole story otherwise',()=>{
  assert.deepEqual(story.advance(catalog,{storyId:'moon',beat:1}),{storyId:'other',beat:0});
  assert.deepEqual(story.advance([catalog[0]],{storyId:'moon',beat:1}),{storyId:'moon',beat:0});
});
test('invalid bookmarks recover without crashing',()=>{
  assert.deepEqual(story.restore(catalog,{storyId:'removed',beat:4},()=>0),{storyId:'moon',beat:0});
  assert.deepEqual(story.restore(catalog,{storyId:'moon',beat:999},()=>0),{storyId:'moon',beat:0});
});
