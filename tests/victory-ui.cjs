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
 await new Promise(r=>server.listen(8785,r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:754}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto('http://localhost:8785');await page.waitForFunction(()=>ready);await page.locator('#play-button').click();
  await page.evaluate(()=>{state=BlobGame.restore({run:49899,best:49899,lifetime:60000});happy=BlobHappy.tryStart(happyRants,BlobHappy.restart(),state.run,()=>0);showHappy();nextLineAt=0;Math.random=()=>0.99;});
  const before=await page.evaluate(()=>bookmark),messages=[];
  for(let i=0;i<100;i++){
   await page.evaluate(()=>{nextLineAt=0;tap()});
   const row=await page.evaluate(()=>({run:state.run,beat:BlobFinale.current(state.run),text:$('speech').textContent,title:$('story-title').textContent,kind:$('conversation').dataset.state,happy:happy.active}));
   assert.equal(row.kind,'finale');assert.equal(row.happy,null);assert.equal(row.text,row.beat.text);assert(row.title.startsWith(String(50000-row.run)+' squishes left'));
   messages.push(row.text);assert.deepEqual(await page.evaluate(()=>bookmark),before);
  }
  assert.equal(new Set(messages).size,20);
  await page.reload();await page.waitForFunction(()=>ready);await page.locator('#play-button').click();
  assert.equal(await page.locator('#conversation').getAttribute('data-state'),'finale');
  await page.evaluate(()=>Math.random=()=>0);await page.locator('#blob').click();assert.equal(await page.evaluate(()=>state.status),'dead');assert.equal(await page.locator('#victory-screen').isVisible(),false);
  await page.locator('#restart').click();assert.deepEqual(await page.evaluate(()=>bookmark),before);assert.equal(await page.locator('#conversation').getAttribute('data-state'),'resumed');
  await page.evaluate(()=>{state=BlobGame.restore({run:49999,best:49999,lifetime:70000});Math.random=()=>0.99;showFinale();render()});
  await page.locator('#blob').click();await page.waitForFunction(()=>sound.victoryMusic.currentTime>0&&!sound.victoryMusic.paused&&victorySheet.complete);
  assert.equal(await page.evaluate(()=>screen),'victory');
  assert.equal(await page.evaluate(()=>{const frames=[0,8,16].map(f=>{drawVictory(victoryStarted+f*115);return $('victory-blob').toDataURL()});return new Set(frames).size}),3);
  assert.equal(await page.evaluate(()=>state.run),50000);
  assert.equal(await page.evaluate(()=>sound.music.paused&&sound.deathMusic.paused&&sound.victoryMusic.loop),true);
  assert.equal(await page.evaluate(()=>sound.victoryMusic.src.endsWith('/victory.mp3')),true);
  await page.evaluate(()=>sound.victoryMusic.currentTime=sound.victoryMusic.duration-0.1);
  await page.waitForFunction(()=>sound.victoryMusic.currentTime<2&&!sound.victoryMusic.paused);
  for(const action of ['volume','mute','background']){
   await page.evaluate(action=>{if(action==='volume')sound.setVolume('music',0);if(action==='mute')sound.setEnabled(false);if(action==='background')sound.setBackground(true)},action);
   assert.equal(await page.evaluate(()=>sound.victoryMusic.paused),true);
   await page.evaluate(action=>{if(action==='volume')sound.setVolume('music',0.35);if(action==='mute')sound.setEnabled(true);if(action==='background')sound.setBackground(false)},action);
   await page.waitForFunction(()=>!sound.victoryMusic.paused&&sound.music.paused&&sound.deathMusic.paused);
  }
  await page.evaluate(()=>sound.setVolume('sfx',0));assert.equal(await page.evaluate(()=>sound.victoryMusic.paused),false);
  await page.locator('#victory-menu').click();assert.equal(await page.evaluate(()=>sound.musicMode),'main');assert.equal(await page.evaluate(()=>sound.victoryMusic.paused),true);
  await page.reload();await page.waitForFunction(()=>ready);assert.equal(await page.evaluate(()=>state.status),'won');await page.locator('#play-button').click();assert.equal(await page.evaluate(()=>screen),'victory');
  for(const [width,height] of [[320,478],[360,550],[390,754],[412,825],[667,285],[844,300]]){
   await page.setViewportSize({width,height});await page.evaluate(()=>document.fonts.ready);
   for(const banner of [0,50,90]){
    await page.evaluate(b=>setAdBannerHeight(b),banner);
    const issues=await page.evaluate(()=>{
     const issues=[];for(const cheer of BlobFinale.cheers){$('victory-cheer').textContent=cheer;for(const id of ['victory-title','victory-record','victory-cheer','victory-restart','victory-menu']){
      const e=id==='victory-record'?document.querySelector('.victory-record'):$(id),r=e.getBoundingClientRect();
      if(r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth)issues.push(id+' outside viewport '+JSON.stringify(r.toJSON()));
      if(e.scrollHeight>e.clientHeight+2)issues.push(id+' clipped vertically');
      if(e.tagName==='BUTTON'&&r.height<44)issues.push(id+' touch target too short');
     }}return issues;
    });assert.deepEqual(issues,[],`${width}x${height} banner ${banner}`);
    const finaleIssues=await page.evaluate(()=>{
     const won=state;state={...state,run:49900,status:'alive'};navigate('game');const issues=[];
     for(let run=49900;run<50000;run+=5){state.run=run;showFinale();render();for(const id of ['speech','story-title','blob']){const el=$(id),r=el.getBoundingClientRect();if(r.bottom>innerHeight||r.top<0||r.left<0||r.right>innerWidth)issues.push(id+' bounds at '+run);if(id==='speech'){const range=document.createRange();range.selectNodeContents(el);const t=range.getBoundingClientRect();if(t.bottom>r.bottom||t.top<r.top)issues.push('countdown text clipped at '+run)}}}
     state=won;navigate('victory');return issues;
    });assert.deepEqual(finaleIssues,[],`countdown ${width}x${height} banner ${banner}`);

   }
  }
  await page.setViewportSize({width:390,height:754});await page.evaluate(()=>setAdBannerHeight(50));await page.screenshot({path:'/tmp/victory-preview.png'});
  await page.emulateMedia({reducedMotion:'reduce'});const first=await page.locator('#victory-blob').evaluate(c=>c.toDataURL());await page.waitForTimeout(300);assert.equal(await page.locator('#victory-blob').evaluate(c=>c.toDataURL()),first);
  await page.locator('#victory-restart').click();assert.equal(await page.evaluate(()=>screen),'game');assert.equal(await page.evaluate(()=>state.run),0);assert.equal(await page.evaluate(()=>state.best),50000);assert.deepEqual(await page.evaluate(()=>bookmark),before);assert.equal(await page.evaluate(()=>happy.count),0);
  assert.deepEqual(errors,[]);console.log('Final 100 lines, saved story, explosion/win boundary, actual victory MP3/loop/controls, saved win replay, three dances/reduced motion and six mobile layouts passed.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
