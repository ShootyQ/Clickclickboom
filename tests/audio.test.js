const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function fixture({enabled=true, settings={}, withDeath=true}={}) {
  class Audio {
    constructor() { this.paused=true; this.currentTime=0; this.plays=0; this.listeners={}; }
    play() { this.paused=false; this.plays++; return Promise.resolve(); }
    pause() { this.paused=true; }
    addEventListener(name, callback) { this.listeners[name]=callback; }
    ended() { this.paused=true; if (this.listeners.ended) this.listeners.ended(); }
  }
  const node=()=>({gain:{value:0},threshold:{value:0},knee:{value:0},ratio:{value:0},connect(){}});
  class AudioContext {
    constructor() { this.state='suspended'; this.currentTime=0; this.destination={}; }
    createGain() { return node(); }
    createDynamicsCompressor() { return node(); }
    createMediaElementSource() { return node(); }
    resume() { this.state='running'; return Promise.resolve(); }
  }
  const context=vm.createContext({Audio,AudioContext});
  vm.runInContext(fs.readFileSync(require.resolve('../src/audio.js'),'utf8'),context);
  return new context.BlobAudio({},enabled,settings,[{src:'first.mp3'},{src:'second.mp3'},{src:'third.mp3'}],withDeath?{src:'death.mp3'}:null,{src:'victory.mp3'});
}
test('main music starts with track one and cycles through all three in order',()=>{
  const sound=fixture();
  assert.equal(sound.music.src,'first.mp3');
  assert.equal(sound.music.paused,true);
  sound.unlock();
  assert.equal(sound.music.paused,false);
  for (const expected of ['second.mp3','third.mp3','first.mp3']) {
    sound.music.ended(); assert.equal(sound.music.src,expected); assert.equal(sound.music.paused,false);
  }
});
test('explosion starts its looping track immediately and resumes the main position afterward',()=>{
  const sound=fixture(); sound.unlock(); sound.music.currentTime=47.5;
  sound.startDeathMusic();
  assert.equal(sound.musicMode,'death');
  assert.equal(sound.music.paused,true);
  assert.equal(sound.deathMusic.loop,true);
  assert.equal(sound.deathMusic.paused,false);
  assert.equal(sound.deathMusic.plays,1);
  sound.deathMusic.currentTime=12;
  sound.endDeathMusic();
  assert.equal(sound.musicMode,'main');
  assert.equal(sound.deathMusic.paused,true);
  assert.equal(sound.deathMusic.currentTime,0);
  assert.equal(sound.music.currentTime,47.5);
  assert.equal(sound.music.paused,false);
  const plays=sound.music.plays; sound.endDeathMusic(); assert.equal(sound.music.plays,plays);
  sound.startDeathMusic(); assert.equal(sound.deathMusic.currentTime,0);
});
test('death music uses the Music slider, stays independent of SFX, and never overlaps main music',()=>{
  const sound=fixture(); sound.unlock(); sound.startDeathMusic(); sound.deathMusic.currentTime=8;
  sound.setVolume('sfx',0);
  assert.equal(sound.deathMusic.paused,false);
  assert.equal(sound.deathMusic.currentTime,8);
  sound.setVolume('music',0);
  assert.equal(sound.deathMusic.paused,true);
  assert.equal(sound.music.paused,true);
  sound.setVolume('music',0.8);
  assert.equal(sound.musicGain.gain.value,0.8);
  assert.equal(sound.deathMusic.paused,false);
  assert.equal(sound.music.paused,true);
  assert.equal(sound.deathMusic.currentTime,8);
});
test('backgrounding and global mute pause both players and resume only the selected music',()=>{
  const sound=fixture(); sound.unlock(); sound.startDeathMusic();
  sound.setBackground(true);
  assert.equal(sound.music.paused,true); assert.equal(sound.deathMusic.paused,true);
  sound.setBackground(false);
  assert.equal(sound.music.paused,true); assert.equal(sound.deathMusic.paused,false);
  sound.setEnabled(false);
  assert.equal(sound.music.paused,true); assert.equal(sound.deathMusic.paused,true);
  sound.setEnabled(true);
  assert.equal(sound.music.paused,true); assert.equal(sound.deathMusic.paused,false);
  sound.setBackground(true); sound.endDeathMusic();
  assert.equal(sound.music.paused,true); assert.equal(sound.deathMusic.paused,true);
  sound.setBackground(false);
  assert.equal(sound.music.paused,false); assert.equal(sound.deathMusic.paused,true);
});
test('muted explosions do not play until unmuted, and a queued main ended event cannot overlap music',()=>{
  const sound=fixture({enabled:false}); sound.startDeathMusic();
  assert.equal(sound.deathMusic.paused,true);
  sound.setEnabled(true); assert.equal(sound.deathMusic.paused,false);
  sound.music.ended();
  assert.equal(sound.trackIndex,1);
  assert.equal(sound.music.paused,true); assert.equal(sound.deathMusic.paused,false);
  sound.setEnabled(false); sound.endDeathMusic(); sound.setEnabled(true);
  assert.equal(sound.music.src,'second.mp3');
  assert.equal(sound.music.paused,false); assert.equal(sound.deathMusic.paused,true);
});
test('missing optional death track keeps the regular playlist usable',()=>{
  const sound=fixture({withDeath:false}); sound.unlock(); sound.startDeathMusic(); sound.endDeathMusic();
  assert.equal(sound.musicMode,'main'); assert.equal(sound.music.paused,false);
});

test('victory song is exclusive, loops, respects all controls and restores the main position',()=>{
 const sound=fixture();sound.unlock();sound.music.currentTime=42;
 sound.startDeathMusic();sound.startVictoryMusic();
 assert.equal(sound.musicMode,'victory');assert.equal(sound.victoryMusic.loop,true);
 assert.equal(sound.victoryMusic.paused,false);assert.equal(sound.music.paused,true);assert.equal(sound.deathMusic.paused,true);
 sound.victoryMusic.currentTime=17;sound.startVictoryMusic();assert.equal(sound.victoryMusic.currentTime,17);
 sound.endDeathMusic();assert.equal(sound.musicMode,'victory');
 sound.setVolume('sfx',0);assert.equal(sound.victoryMusic.paused,false);
 sound.setVolume('music',0);assert.equal(sound.victoryMusic.paused,true);
 sound.setVolume('music',0.6);assert.equal(sound.victoryMusic.paused,false);
 sound.setBackground(true);assert.equal(sound.victoryMusic.paused,true);
 sound.setBackground(false);assert.equal(sound.victoryMusic.paused,false);
 sound.setEnabled(false);assert.equal(sound.victoryMusic.paused,true);
 sound.setEnabled(true);assert.equal(sound.victoryMusic.paused,false);
 sound.music.ended();assert.equal(sound.music.paused,true);
 sound.endVictoryMusic();assert.equal(sound.victoryMusic.paused,true);assert.equal(sound.victoryMusic.currentTime,0);
 assert.equal(sound.musicMode,'main');assert.equal(sound.music.paused,false);
});
