const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const server = http.createServer(async (request, response) => {
  try {
    const file = path.join(root, request.url === '/' ? 'index.html' : request.url.split('?')[0]);
    response.setHeader('Content-Type', ({'.html':'text/html', '.png':'image/png', '.ttf':'font/ttf', '.wav':'audio/wav', '.mp3':'audio/mpeg'})[path.extname(file)] || 'application/octet-stream');
    response.end(await fs.readFile(file));
  } catch (_) { response.writeHead(404); response.end(); }
});
(async () => {
  await new Promise(resolve => server.listen(8796, resolve));
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:390, height:844}});
    await page.goto('http://localhost:8796');
    await page.waitForFunction(() => ready);
    await page.evaluate(() => {
      sound.setEnabled(false); happy=BlobHappy.restart(happy);
      state=BlobGame.restore({run:50,status:'alive'});
      const story=stories.find(s=>s.id==='cancelling-my-gym-membership');
      bookmark={storyId:story.id,beat:story.beats.length-1};
      showStory(); navigate('game'); save();
    });
    assert.equal(await page.locator('#speech').textContent(),'I kept moving.');
    const advance=()=>page.evaluate(()=>{
      nextLineAt=0;nextMilestoneAt=Infinity;
      const original=Math.random;Math.random=()=>0.99;
      try{tap()}finally{Math.random=original}
    });
    await advance();
    const selected=await page.evaluate(()=>JSON.parse(JSON.stringify(bookmark)));
    assert(selected.transition);
    assert.notEqual(selected.storyId,'cancelling-my-gym-membership');
    assert.equal(await page.locator('#conversation').getAttribute('data-state'),'bridge');
    assert.equal(await page.locator('#story-title').textContent(),'Between stories');
    await advance();
    const checkpoint=await page.evaluate(()=>JSON.parse(JSON.stringify(bookmark)));
    assert.equal(checkpoint.transition.beat,1);
    const text=await page.locator('#speech').textContent();
    await page.evaluate(()=>{interrupt('Quick interruption!');const original=Math.random;Math.random=()=>0;try{tap()}finally{Math.random=original}});
    assert.equal(await page.evaluate(()=>state.status),'dead');
    await page.reload();await page.waitForFunction(()=>ready);
    assert.deepEqual(await page.evaluate(()=>bookmark),checkpoint);
    await page.evaluate(()=>{unlockAt=0;newRun()});
    assert.equal(await page.locator('#speech').textContent(),text);
    assert.equal(await page.locator('#conversation').getAttribute('data-state'),'bridge');
    const length=await page.evaluate(()=>storyTransitions.find(t=>t.id===bookmark.transition.id).lines.length);
    for(let beat=2;beat<length;beat++)await advance();
    await advance();
    assert.deepEqual(await page.evaluate(()=>bookmark),{storyId:selected.storyId,beat:0});
    const opening=await page.evaluate(()=>stories.find(s=>s.id===bookmark.storyId).beats[0].text);
    assert.equal(await page.locator('#speech').textContent(),opening);
    assert.equal(await page.locator('#conversation').getAttribute('data-state'),'story');
    console.log('Gym ending → handoff → interruption/explosion → saved reload/restart → next story opening passed.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode=1; server.close(); });
