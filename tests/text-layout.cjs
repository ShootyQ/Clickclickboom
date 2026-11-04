const assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const fs=require('node:fs/promises'),http=require('node:http'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const server=http.createServer(async(req,res)=>{try{const file=path.join(root,req.url==='/'?'index.html':req.url.split('?')[0]);res.setHeader('Content-Type',({'.html':'text/html','.png':'image/png','.ttf':'font/ttf','.mp3':'audio/mpeg','.wav':'audio/wav'})[path.extname(file)]||'application/octet-stream');res.end(await fs.readFile(file));}catch(_){res.writeHead(404);res.end();}});
(async()=>{
 await new Promise(r=>server.listen(8786,r));
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 try{
  const page=await browser.newPage();await page.goto('http://localhost:8786');await page.waitForFunction(()=>ready);await page.evaluate(()=>document.fonts.ready);
  for(const [width,height] of [[320,478],[320,568],[360,550],[360,640],[390,754],[390,844],[412,825],[412,915],[667,285],[844,300]]){
   await page.setViewportSize({width,height});
   for(const banner of [0,50,90])for(const status of ['alive','dead','won']){
    const issues=await page.evaluate(({banner,status})=>{
     setAdBannerHeight(banner);state=BlobGame.restore({run:status==='won'?50000:0});navigate('game');state.status=status;render();
     // Inspect the score panel in the splat layout as well as live and completed runs.
     if(screen==='victory'){screen='game';$('victory-screen').hidden=true;$('game-screen').hidden=false;}
     const issues=[],panel=document.querySelector('.score-plaque').getBoundingClientRect();
     for(const selector of ['.goal','.score','.target']){
      const el=document.querySelector('.score-plaque '+selector);if(!el.getClientRects().length)continue;
      const range=document.createRange();range.selectNodeContents(el);const text=range.getBoundingClientRect();
      if(text.top<panel.top+4||text.bottom>panel.bottom-4||text.left<panel.left||text.right>panel.right)issues.push(selector+' outside panel '+JSON.stringify({text:text.toJSON(),panel:panel.toJSON()}));
     }
     const target=document.querySelector('.target').getBoundingClientRect(),ribbon=$('story-mode').getBoundingClientRect();if(target.bottom>ribbon.top)issues.push('target overlaps story ribbon');
     return issues;
    },{banner,status});assert.deepEqual(issues,[],`${width}x${height} ${banner} ${status}`);
   }
  }
  await page.setViewportSize({width:390,height:754});await page.evaluate(()=>{setAdBannerHeight(0);state=BlobGame.restore({status:'dead',best:1012,lifetime:1013,deaths:1});navigate('game');conversationState('dead');mode='boom';started=-100000;$('speech').textContent="1,012 clicks. Hold that thought. I've become floor.";render()});
  await page.waitForTimeout(100);await page.screenshot({path:'/tmp/splat-text-fixed.png'});
  const box=await page.locator('#speech').boundingBox();await page.mouse.click(box.x+80,box.y+30,{clickCount:3});assert.equal(await page.evaluate(()=>getSelection().toString()),'');
  await page.mouse.move(box.x+80,box.y+30);await page.mouse.down();await page.waitForTimeout(1100);await page.mouse.up();assert.equal(await page.evaluate(()=>getSelection().toString()),'');
  assert.equal(await page.evaluate(()=>$('speech').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))),false);
  await page.locator('#audio-open').click();await page.locator('#music-volume').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.locator('#music-volume').inputValue(),'36');
  console.log('Score, goal and target remain inside their panel across ten mobile sizes, three banner heights and live/dead/won layouts; selection/context menus disabled and volume slider works.');
 }finally{await browser.close();await new Promise(r=>server.close(r));}
})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
