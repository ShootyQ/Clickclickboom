const assert=require('node:assert/strict');
const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
const server=http.createServer((req,res)=>{const f=path.join(root,req.url==='/'?'index.html':req.url);fs.readFile(f,(e,b)=>{res.statusCode=e?404:200;res.setHeader('Content-Type',path.extname(f)==='.html'?'text/html':'application/octet-stream');res.end(e?'missing':b)})});
(async()=>{await new Promise(r=>server.listen(8795,r));const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});try{
 const page=await browser.newPage({viewport:{width:390,height:754}}),errors=[];page.on('pageerror',e=>errors.push(String(e)));
 await page.addInitScript(()=>{
  window.frameQueue=[];window.animNow=1000;
  Object.defineProperty(performance,'now',{value:()=>window.animNow});
  window.requestAnimationFrame=fn=>{frameQueue.push(fn);return frameQueue.length};
  window.frameAt=now=>{window.animNow=now+.25;const frames=frameQueue.splice(0);for(const fn of frames)fn(now)};
 });
 await page.goto('http://localhost:8795');await page.waitForFunction(()=>typeof ready!=='undefined'&&ready,null,{polling:20});
 await page.evaluate(()=>document.fonts.ready);
 const result=await page.evaluate(()=>{
  sound.setEnabled(false);Math.random=()=>.99;state=BlobGame.restore({run:13});showStory();navigate('game');
  const stats=()=>{const p=ctx.getImageData(0,0,384,384).data;let opaque=0,red=0;for(let i=0;i<p.length;i+=4){if(p[i+3]>128)opaque++;if(p[i+3]>190&&p[i]>120&&p[i+1]<115&&p[i+2]<115)red++}return{opaque,red}};
  window.animationPixels=stats;
  const bad=[];let minOpaque=Infinity,minRed=Infinity,frames=0;
  const check=label=>{const s=stats();frames++;minOpaque=Math.min(minOpaque,s.opaque);minRed=Math.min(minRed,s.red);if(s.opaque<25000||s.red<12000)bad.push({label,...s})};
  frameAt(1000);check('initial');play('tap');frameAt(started-.1);check('timestamp before tap');
  for(let t=1016;t<1900;t+=8){frameAt(t);check('single tap '+t)}
  for(let t=2000;t<5000;t+=50){animNow=t+.1;tap();frameAt(t);check('rapid negative timestamp '+t);for(let dt=8;dt<50;dt+=8){frameAt(t+dt);check('rapid '+(t+dt))}}
  for(let t=5000;t<6000;t+=8){frameAt(t);check('return to nervous '+t)}
  const afterRapid={run:state.run,mode};
  const before=canvas.toDataURL();const rejected=blobRenderer.draw({frame:NaN},animNow)===false;const keptFrame=before===canvas.toDataURL();
  window.animationBaseline=stats().opaque;
  return {bad,minOpaque,minRed,frames,afterRapid,rejected,keptFrame};
 });
 assert.deepEqual(result.bad,[]);assert.equal(result.afterRapid.run,73);assert.equal(result.afterRapid.mode,'nervous');
 assert(result.rejected&&result.keptFrame);
 // Every tap contributes even when several taps arrive before one paint.
 const burst=await page.evaluate(()=>{animNow=6100;for(let i=0;i<5;i++)tap();frameAt(6099.9);return {run:state.run,pixels:animationPixels()}});
 assert.equal(burst.run,78);assert(burst.pixels.red>12000);
 // Preserve real explosion art/timing and hold only the final puddles.
 const death=await page.evaluate(()=>{animNow=6200;Math.random=()=>0;tap();const start=started;frameAt(start-.1);const first=animationPixels();frameAt(start+780);const last=animationPixels();frameAt(start+5000);return {status:state.status,first,last,held:animationPixels()}});
 assert.equal(death.status,'dead');assert(death.first.opaque>25000);assert(death.last.opaque<death.first.opaque/2);assert.deepEqual(death.last,death.held);
 // Reduced motion is static while scores still advance.
 await page.emulateMedia({reducedMotion:'reduce'});
 const reduced=await page.evaluate(()=>{animNow=13000;newRun();state.run=100;mode='nervous';started=12000;frameAt(13000);const before=canvas.toDataURL();Math.random=()=>.99;for(let i=0;i<8;i++){animNow=13016+i*16;tap();frameAt(animNow-.1)}return {same:before===canvas.toDataURL(),run:state.run,pixels:animationPixels()}});
 assert.equal(reduced.same,true);assert.equal(reduced.run,108);assert(reduced.pixels.red>12000);
 await page.waitForFunction(()=>victorySheet.complete&&victorySheet.naturalWidth,null,{polling:20});
 assert(await page.evaluate(()=>{state=BlobGame.restore({run:50000});navigate('victory');frameAt(victoryStarted-.1);const p=$('victory-blob').getContext('2d').getImageData(0,0,384,384).data;let n=0;for(let i=3;i<p.length;i+=4)if(p[i]>128)n++;return n>25000}));
 assert.deepEqual(errors,[]);
 console.log('Animation pixels:',JSON.stringify(result));
 console.log('Blank-frame boundary, continuous spring motion, 60 rapid taps, same-frame burst, mood recovery, explosion puddles, reduced motion and victory timing passed.');
 }finally{await browser.close();server.close()}})().catch(e=>{console.error(e);process.exitCode=1;server.close()});
