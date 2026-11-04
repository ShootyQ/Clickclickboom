const test=require('node:test'),assert=require('node:assert/strict');
const finale=require('../src/finale.js'),game=require('../src/game.js');
test('twenty countdown lines cover exactly the final hundred surviving clicks',()=>{
 assert.equal(finale.current(49899),null);assert.equal(finale.current(50000),null);
 const counts=new Map();
 for(let run=49900;run<50000;run++){
  const beat=finale.current(run);assert.equal(beat.remaining,50000-run);
  counts.set(beat.text,(counts.get(beat.text)||0)+1);
 }
 assert.equal(counts.size,20);for(const count of counts.values())assert.equal(count,5);
 assert.equal(new Set(finale.lines).size,20);
});
test('the final countdown does not protect even the winning tap from explosions',()=>{
 for(const run of [49900,49995,49999]){
  const result=game.tap(game.restore({run}),()=>0);assert.equal(result.event,'boom');
 }
 assert.equal(game.tap(game.restore({run:49999}),()=>0.99).event,'win');
});
