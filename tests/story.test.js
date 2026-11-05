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
const transitions = require('../content/story-transitions.json');
test('all ten handoffs play fully, then show the next story from its first beat',()=>{
  assert.equal(transitions.length,10);
  assert.equal(new Set(transitions.map(t=>t.id)).size,10);
  transitions.forEach((entry,index)=>{
    assert(entry.lines.length>=3 && entry.lines.length<=5);
    let bookmark=story.advance(catalog,{storyId:'moon',beat:1},()=> (index+0.5)/transitions.length,transitions);
    assert.equal(bookmark.storyId,'other');
    entry.lines.forEach((line,beat)=>{
      assert.equal(bookmark.transition.beat,beat);
      assert.equal(story.current(catalog,bookmark,transitions).text,line);
      assert(story.current(catalog,bookmark,transitions).pauseAfterMs>=1500);
      bookmark=story.restore(catalog,JSON.parse(JSON.stringify(bookmark)),()=>0,transitions);
      bookmark=story.advance(catalog,bookmark,()=>0,transitions);
    });
    assert.deepEqual(bookmark,{storyId:'other',beat:0});
    assert.equal(story.current(catalog,bookmark,transitions).text,'Other');
  });
});
test('handoffs only begin after the last beat, and old saves have no added preamble',()=>{
  const saved={storyId:'moon',beat:0};
  assert.deepEqual(story.restore(catalog,saved,()=>0,transitions),saved);
  assert.deepEqual(story.advance(catalog,saved,()=>0,transitions),{storyId:'moon',beat:1});
  assert.deepEqual(story.choose(catalog,null,()=>0),saved);
});
test('removed or invalid saved handoffs safely resume the selected story opening',()=>{
  for(const transition of [{id:'removed',beat:0},{id:transitions[0].id,beat:-1},{id:transitions[0].id,beat:99}]) {
    assert.deepEqual(story.restore(catalog,{storyId:'other',beat:0,transition},()=>0,transitions),{storyId:'other',beat:0});
  }
});
