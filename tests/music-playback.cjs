const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const http=require('node:http'),fs=require('node:fs/promises'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const server=http.createServer(async(req,res)=>{
  try {
    const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);
    const bytes=await fs.readFile(file);
    res.setHeader('Content-Type',({'.html':'text/html','.png':'image/png','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');
    res.setHeader('Accept-Ranges','bytes');
    const range=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range||'');
    if(range){
      const start=Number(range[1]),end=range[2]?Math.min(Number(range[2]),bytes.length-1):bytes.length-1;
      res.statusCode=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${bytes.length}`);
      res.setHeader('Content-Length',end-start+1);res.end(bytes.subarray(start,end+1));
    }else{res.setHeader('Content-Length',bytes.length);res.end(bytes);}
  }catch(_){res.writeHead(404);res.end();}
});
(async()=>{
  await new Promise(r=>server.listen(8783,r));
  const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    const page=await browser.newPage({viewport:{width:390,height:844}});
    await page.goto('http://localhost:8783');await page.waitForFunction(()=>ready);
    await page.locator('#play-button').click();
    await page.waitForFunction(()=>sound.music.readyState>=2&&!sound.music.paused);
    assert.equal(await page.evaluate(()=>sound.music.src.endsWith('/slimey-breeze.mp3')),true);
    for(const next of ['slimey-breezy-day.mp3','squish-squish-3.mp3','slimey-breeze.mp3']){
      await page.evaluate(()=>{sound.music.currentTime=sound.music.duration-0.1;});
      try { await page.waitForFunction(next=>sound.music.src.endsWith('/'+next)&&sound.music.readyState>=2&&!sound.music.paused,next); } catch(error) { console.error('Expected',next,await page.evaluate(()=>({src:sound.music.src,paused:sound.music.paused,ended:sound.music.ended,time:sound.music.currentTime,duration:sound.music.duration,ready:sound.music.readyState,error:sound.music.error?.code,context:sound.context.state}))); throw error; }
    }
    const mainPosition=await page.evaluate(()=>{sound.music.currentTime=25;return sound.music.currentTime;});
    await page.waitForFunction(()=>sound.deathMusic.readyState>=2);
    await page.evaluate(()=>{window.savedRandom=Math.random;Math.random=()=>0;});
    await page.locator('#blob').click();
    await page.evaluate(()=>{Math.random=window.savedRandom;});
    await page.waitForFunction(()=>sound.musicMode==='death'&&!sound.deathMusic.paused);
    assert.equal(await page.evaluate(()=>state.status),'dead');
    assert.equal(await page.evaluate(()=>sound.music.paused&&sound.deathMusic.loop),true);
    assert(Math.abs(await page.evaluate(()=>sound.music.currentTime)-mainPosition)<1);
    assert.equal(await page.evaluate(()=>sound.deathMusic.src.endsWith('/the-last-squirt.mp3')),true);
    await page.evaluate(()=>{sound.deathMusic.currentTime=sound.deathMusic.duration-0.1;});
    await page.waitForFunction(()=>sound.deathMusic.currentTime<2&&!sound.deathMusic.paused);
    await page.locator('#audio-open').click();
    await page.locator('#sfx-volume').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.evaluate(()=>sound.deathMusic.paused),false);
    await page.locator('#music-volume').evaluate(el=>{el.value='0';el.dispatchEvent(new Event('input',{bubbles:true}));});
    assert.equal(await page.evaluate(()=>sound.deathMusic.paused&&sound.music.paused),true);
    await page.locator('#music-volume').evaluate(el=>{el.value='45';el.dispatchEvent(new Event('input',{bubbles:true}));});
    await page.waitForFunction(()=>!sound.deathMusic.paused&&sound.music.paused);
    assert(Math.abs(await page.evaluate(()=>sound.musicGain.gain.value)-0.45)<0.0001);
    await page.evaluate(()=>setAudioBackgrounded(true));
    assert.equal(await page.evaluate(()=>sound.deathMusic.paused&&sound.music.paused),true);
    await page.evaluate(()=>setAudioBackgrounded(false));
    await page.waitForFunction(()=>!sound.deathMusic.paused&&sound.music.paused);
    await page.locator('#sound-toggle').click();
    assert.equal(await page.evaluate(()=>sound.deathMusic.paused&&sound.music.paused),true);
    await page.locator('#sound-toggle').click();
    await page.waitForFunction(()=>!sound.deathMusic.paused&&sound.music.paused);
    await page.locator('#audio-close').click();
    await page.locator('#game-menu').click();
    await page.waitForFunction(()=>sound.musicMode==='main'&&!sound.music.paused&&sound.deathMusic.paused);
    assert.equal(await page.evaluate(()=>sound.deathMusic.currentTime),0);
    await page.locator('#play-button').click();await page.locator('#restart').click();
    await page.evaluate(()=>{window.savedRandom=Math.random;Math.random=()=>0;});
    await page.locator('#blob').click();await page.evaluate(()=>{Math.random=window.savedRandom;});
    await page.waitForFunction(()=>sound.musicMode==='death'&&!sound.deathMusic.paused);
    await page.locator('#restart').click();
    await page.waitForFunction(()=>sound.musicMode==='main'&&!sound.music.paused&&sound.deathMusic.paused);
    assert.equal(await page.evaluate(()=>state.status),'alive');
    assert.equal(await page.evaluate(()=>sound.deathMusic.currentTime),0);
    console.log('Real MP3 playback: three-track playlist order, immediate death loop, loop wrap, sliders/mute/background, Menu, and New Game passed.');
  }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
