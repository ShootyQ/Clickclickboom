const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const server=http.createServer(async(req,res)=>{try{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',({'.html':'text/html','.png':'image/png','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch(_){res.writeHead(404);res.end();}});
(async()=>{
 await new Promise(r=>server.listen(8784,r));
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto('http://localhost:8784');await page.waitForFunction(()=>ready);
  await page.evaluate(()=>{
   sound.setEnabled(false);state=BlobGame.restore({run:499,best:8000,lifetime:12000,deaths:3});
   bookmark={storyId:'accidentally-became-the-moon',beat:150};happy=BlobHappy.restart();showStory();navigate('game');save();
  });
  const bookmarkBefore=await page.evaluate(()=>bookmark),textBefore=await page.locator('#speech').textContent();
  async function tap(rolls){await page.evaluate(rolls=>{window.oldRandom=Math.random;Math.random=()=>rolls.length?rolls.shift():0.99;},rolls);await page.locator('#blob').click();await page.evaluate(()=>Math.random=window.oldRandom);}
  await tap([0.99,0,0]);
  assert.equal(await page.evaluate(()=>happy.count),1);
  assert.equal(await page.evaluate(()=>happy.lastStart),500);
  assert.equal(await page.locator('#conversation').getAttribute('data-state'),'happy');
  assert.equal(await page.locator('#happy-hearts').isVisible(),true);
  assert.deepEqual(await page.evaluate(()=>bookmark),bookmarkBefore);
  await tap([0.99]);assert.equal(await page.evaluate(()=>happy.active.line),0,'rapid taps cannot skip unread lines');
  for(let i=0;i<4;i++){await page.evaluate(()=>nextLineAt=0);await tap([0.99]);}
  const checkpoint=await page.evaluate(()=>happy),happyText=await page.locator('#speech').textContent();
  await page.reload();await page.waitForFunction(()=>ready);await page.locator('#play-button').click();
  assert.deepEqual(await page.evaluate(()=>happy),checkpoint);
  assert.equal(await page.locator('#speech').textContent(),happyText);
  assert.deepEqual(await page.evaluate(()=>bookmark),bookmarkBefore);
  await page.evaluate(()=>nextLineAt=performance.now()+5000);
  await page.locator('#game-menu').click();await page.waitForTimeout(250);await page.locator('#play-button').click();
  assert(await page.evaluate(()=>nextLineAt-performance.now()>4500),'Menu preserves the remaining reading time');
  while(await page.evaluate(()=>!!happy.active)){await page.evaluate(()=>nextLineAt=0);await tap([0.99]);}
  assert.equal(await page.locator('#speech').textContent(),textBefore);
  assert.equal(await page.locator('#conversation').getAttribute('data-state'),'resumed');
  assert.equal(await page.locator('#happy-hearts').isVisible(),false);
  await page.evaluate(()=>{state.run=happy.lastStart+498;nextLineAt=performance.now()+999999;});
  await tap([0.99,0,0]);assert.equal(await page.evaluate(()=>happy.count),1);
  await page.evaluate(()=>{showStory();nextLineAt=performance.now()+999999;});
  await tap([0.99,0,0]);assert.equal(await page.evaluate(()=>happy.count),2);
  assert.equal(await page.evaluate(()=>happy.lastStart),1000);
  while(await page.evaluate(()=>!!happy.active)){await page.evaluate(()=>nextLineAt=0);await tap([0.99]);}
  await page.evaluate(()=>{state.run=5000;nextLineAt=performance.now()+999999;});
  await tap([0.99,0,0]);assert.equal(await page.evaluate(()=>happy.active),null);assert.equal(await page.evaluate(()=>happy.count),2);
  await tap([0]);assert.equal(await page.evaluate(()=>state.status),'dead');
  await page.reload();await page.waitForFunction(()=>ready);await page.locator('#play-button').click();
  assert.equal(await page.evaluate(()=>happy.count),2);await page.locator('#restart').click();
  assert.equal(await page.evaluate(()=>happy.count),0);
  await tap([0.99,0,0]);assert(await page.evaluate(()=>!!happy.active));
  await tap([0]);assert.equal(await page.evaluate(()=>happy.active),null);
  assert.equal(await page.locator('#happy-hearts').isVisible(),false);
  assert.deepEqual(await page.evaluate(()=>bookmark),bookmarkBefore);
  await page.evaluate(()=>{state=BlobGame.restore({run:49999,best:49999,lifetime:60000});happy=BlobHappy.restart();showStory();render();});
  await tap([0.99,0,0]);assert.equal(await page.evaluate(()=>state.status),'won');
  assert.equal(await page.evaluate(()=>happy.count),0);assert.equal(await page.evaluate(()=>happy.active),null);
  await page.close();
  for(const [width,height] of [[320,478],[360,550],[390,754],[412,825],[667,285],[844,300]]){
   const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
   await p.goto('http://localhost:8784');await p.waitForFunction(()=>ready);await p.evaluate(()=>document.fonts.ready);
   const issues=await p.evaluate(()=>{
    sound.setEnabled(false);window.setAdBannerHeight(0);document.documentElement.classList.add('native-host');
    state=BlobGame.restore({run:500,best:1539,lifetime:4000});navigate('game');
    const issues=[];
    for(const rant of happyRants)for(let line=0;line<rant.lines.length;line++){
     happy={count:1,lastStart:500,lastId:rant.id,active:{id:rant.id,line}};showHappy();render();
     const speech=$('speech'),rect=speech.getBoundingClientRect(),range=document.createRange();range.selectNodeContents(speech);const text=range.getBoundingClientRect();
     if(text.top<rect.top-1||text.bottom>rect.bottom+1)issues.push(rant.id+': clipped line '+line);
     for(const el of document.querySelectorAll('#game-screen button,#game-screen .stats')){
      const r=el.getBoundingClientRect();if(r.width&&r.height&&(r.bottom>innerHeight+1||r.top<0||r.right>innerWidth+1||r.left<0))issues.push(rant.id+': '+el.id+' outside viewport');
     }
    }
    return issues;
   });
   assert.deepEqual(issues,[],`${width}x${height} layout`);
   assert.equal(await p.locator('#happy-hearts > span').first().evaluate(el=>getComputedStyle(el).animationName),'none');
   if(width===390){await p.evaluate(()=>{happy={count:1,lastStart:500,lastId:happyRants[0].id,active:{id:happyRants[0].id,line:6}};showHappy();});await p.screenshot({path:'/tmp/happy-rant-preview.png'});}
   await p.close();
  }
  console.log('Happy UI: real trigger, line pacing, saved quota/line, Menu pause, 500-click gap, two-rant cap, death/restart/win priority, and all 240 lines at six phone sizes passed.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close();});
