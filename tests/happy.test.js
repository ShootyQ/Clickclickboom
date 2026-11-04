const test=require('node:test');
const assert=require('node:assert/strict');
const happy=require('../src/happy.js');
const catalog=require('../content/happy-rants.json');
const finish=state=>{while(state.active)state=happy.advance(catalog,state);return state;};
test('twenty distinct happy rants each contain 10–15 readable lines',()=>{
  assert.equal(catalog.length,20);
  assert.equal(new Set(catalog.map(r=>r.id)).size,20);
  assert.equal(new Set(catalog.map(r=>JSON.stringify(r.lines))).size,20);
  for(const rant of catalog){
    assert(rant.lines.length>=10&&rant.lines.length<=15);
    assert(rant.lines.every(line=>typeof line==='string'&&line.trim()&&line.length<=180));
  }
});
test('eligible taps use exactly a 1-in-500 chance, including the boundary',()=>{
  const fresh=happy.restart();
  const trials=Array.from({length:500},(_,i)=>happy.tryStart(catalog,fresh,1,()=>(i+0.5)/500));
  assert.equal(trials.filter(state=>state.active).length,1);
  assert.equal(happy.tryStart(catalog,fresh,1,()=>1/500),fresh);
  assert(happy.tryStart(catalog,fresh,1,()=>0.001999).active);
});
test('second activation waits 500 clicks from the first, and a third is blocked',()=>{
  let state=happy.tryStart(catalog,happy.restart(),25,()=>0);
  assert.equal(state.count,1);assert.equal(state.lastStart,25);
  const first=state.active.id;
  assert.equal(happy.tryStart(catalog,state,1000,()=>{throw Error('No roll during active rant');}),state);
  state=finish(state);
  assert.equal(happy.tryStart(catalog,state,524,()=>{throw Error('No roll before cooldown');}),state);
  state=happy.tryStart(catalog,state,525,()=>0);
  assert.equal(state.count,2);assert.equal(state.lastStart,525);assert.notEqual(state.active.id,first);
  state=finish(state);
  assert.equal(happy.tryStart(catalog,state,49999,()=>{throw Error('No third roll');}),state);
});
test('all twenty variations can be chosen, without immediately repeating the last',()=>{
  const ids=Array.from({length:20},(_,i)=>{
    let call=0;
    return happy.tryStart(catalog,happy.restart(),1,()=>call++===0?0:(i+0.5)/20).active.id;
  });
  assert.equal(new Set(ids).size,20);
  let state=happy.tryStart(catalog,happy.restart(),1,()=>0);
  const lastId=state.lastId;
  state=happy.restart(state);
  assert.equal(state.count,0);assert.equal(state.lastStart,null);assert.equal(state.active,null);
  assert.notEqual(happy.tryStart(catalog,state,1,()=>0).active.id,lastId);
});
test('reload preserves the exact line, per-run quota and click cooldown',()=>{
  let state=happy.tryStart(catalog,happy.restart(),123,()=>0);
  state=happy.advance(catalog,state);state=happy.advance(catalog,state);
  const restored=happy.restore(catalog,JSON.parse(JSON.stringify(state)));
  assert.deepEqual(restored,state);
  assert.equal(happy.current(catalog,restored).line,3);
  assert.equal(happy.current(catalog,restored).text,catalog[0].lines[2]);
  const cancelled=happy.cancel(restored);
  assert.equal(cancelled.active,null);assert.equal(cancelled.count,1);assert.equal(cancelled.lastStart,123);
  assert.equal(happy.eligible(cancelled,622),false);
  assert.equal(happy.eligible(cancelled,623),true);
});
test('old and malformed saves recover without losing a valid quota',()=>{
  assert.deepEqual(happy.restore(catalog,null),happy.restart());
  const restored=happy.restore(catalog,{count:2,lastStart:700,lastId:'missing',active:{id:'missing',line:90}});
  assert.equal(restored.count,2);assert.equal(restored.active,null);assert.equal(restored.lastId,null);
  assert.equal(happy.eligible(restored,10000),false);
  assert.equal(happy.current(catalog,happy.restart()),null);
});
