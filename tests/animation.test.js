const test=require('node:test'),assert=require('node:assert/strict');
const {animations,elapsed,sample,Squish}=require('../src/animation.js');
test('a frame timestamp before a tap never selects outside the sprite sheet',()=>{
 assert.equal(elapsed(999.9,1000),0);
 for(const mode of Object.keys(animations))assert(Number.isInteger(sample(mode,999.9,1000).frame));
});
test('all animation modes remain valid across fractional frames and long pauses',()=>{
 for(const mode of Object.keys(animations))for(const rest of ['idle','nervous'])
 for(const offset of [-100,-.1,0,.01,32.5,64.999,65,129.999,130,259.9,260,389.999,390,520,650,780,5000,3600000]){
  const pose=sample(mode,1000+offset,1000,rest);assert(Number.isInteger(pose.frame)&&pose.frame>=0&&pose.frame<24);
 }
});
test('taps retain the resting face cadence instead of swapping images on restart',()=>{
 for(const rest of ['idle','nervous'])for(const now of [1000,1032.5,1389.999,1390,5000]){
  assert.equal(sample('tap',now,1000,rest).frame,sample(rest,now,1000,rest).frame);
 }
 assert.equal(sample('tap',1390,1000,'nervous').mode,'idle');
});
test('explosion flash, landing and final puddles preserve their timing',()=>{
 for(const reduced of [false,true])for(const [offset,frame] of [[0,18],[130,19],[260,20],[390,21],[520,22],[650,23],[780,23],[60000,23]])assert.equal(sample('boom',1000+offset,1000,'idle',reduced).frame,frame);
});
test('reduced motion holds a static resting frame through rapid taps',()=>{
 for(const rest of ['idle','nervous'])for(const offset of [0,30,100,389,390,5000])assert.equal(sample('tap',1000+offset,1000,rest,true).frame,animations.idle.frames[0]);
});
test('squish reacts, stays bounded under rapid tapping and settles without a reset',()=>{
 const motion=new Squish();motion.tap(1000);motion.advance(1032);assert(motion.scale().y<.95);assert(motion.scale().x>1);
 let peak=0;for(let t=1032;t<5000;t+=8){if(t%24===0)motion.tap(t+.1);motion.advance(t);const s=motion.scale();assert(Number.isFinite(s.x)&&s.x<=1.12);assert(s.y>=.748&&s.y<=1.037);peak=Math.max(peak,motion.amount)}assert(peak>.3);
 for(let t=5000;t<7500;t+=8)motion.advance(t);assert.equal(motion.amount,0);assert.deepEqual(motion.scale(),{x:1,y:1});
 motion.tap(8000);motion.advance(8016);motion.advance(60000);assert.deepEqual(motion.scale(),{x:1,y:1});
});

test('living poses always use happy sprites, even for old nervous requests',()=>{
 for(const mode of ['idle','tap','nervous'])for(const now of [0,1000,1032.5,1390,50000,1000000]) {
  const pose=sample(mode,now,1000,'nervous');assert(pose.frame>=0&&pose.frame<=5);assert.notEqual(pose.mode,'nervous');
 }
});
