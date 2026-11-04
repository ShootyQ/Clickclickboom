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
  await new Promise(resolve => server.listen(8782, resolve));
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  try {
    const page = await browser.newPage({viewport:{width:390, height:844}});
    const checkpoint = {storyId:'accidentally-became-the-moon', beat:150};
    await page.goto('http://localhost:8782');
    // Existing saves must retain their current score and story after the update.
    await page.evaluate(story => localStorage.setItem('clickclickboom.v1', JSON.stringify({run:8000,best:8000,lifetime:12000,deaths:3,status:'alive',story,soundEnabled:false})), checkpoint);
    await page.reload();
    await page.waitForFunction(() => ready);
    assert.equal(await page.evaluate(() => state.run),8000);
    assert.deepEqual(await page.evaluate(() => bookmark),checkpoint);
    await page.locator('#play-button').click();
    const text = await page.locator('#speech').textContent();
    // An interruption must not replace the saved story position if the blob explodes.
    await page.evaluate(() => interrupt(milestones['1000'][0]));
    await page.evaluate(() => { const original=Math.random; Math.random=()=>0; tap(); Math.random=original; });
    assert.equal(await page.evaluate(() => state.status),'dead');
    assert.equal(await page.evaluate(() => state.run),0);
    assert.deepEqual(await page.evaluate(() => bookmark),checkpoint);
    assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('clickclickboom.v1')).story),checkpoint);
    // Reopen while dead, then restart through the actual buttons.
    await page.reload();
    await page.waitForFunction(() => ready);
    assert.deepEqual(await page.evaluate(() => bookmark),checkpoint);
    await page.locator('#play-button').click();
    await page.locator('#restart').click();
    assert.equal(await page.evaluate(() => state.run),0);
    assert.equal(await page.evaluate(() => state.best),8000);
    assert.equal(await page.evaluate(() => state.deaths),4);
    assert.deepEqual(await page.evaluate(() => bookmark),checkpoint);
    assert.equal(await page.locator('#speech').textContent(),text);
    assert.equal(await page.locator('#conversation').getAttribute('data-state'),'resumed');
    // The next eligible surviving tap advances normally instead of looping the saved beat.
    await page.evaluate(() => { nextLineAt=0; const original=Math.random; Math.random=()=>0.99; tap(); Math.random=original; });
    assert.deepEqual(await page.evaluate(() => bookmark),{...checkpoint,beat:151});
    await page.reload();
    await page.waitForFunction(() => ready);
    assert.deepEqual(await page.evaluate(() => bookmark),{...checkpoint,beat:151});
    // Old dead saves with no bookmark recover once and then retain the new bookmark.
    await page.evaluate(() => localStorage.setItem('clickclickboom.v1',JSON.stringify({status:'dead',story:null,soundEnabled:false})));
    await page.reload();
    await page.waitForFunction(() => ready);
    const recovered=await page.evaluate(() => bookmark);
    assert(recovered && recovered.storyId && recovered.beat===0);
    await page.reload();
    await page.waitForFunction(() => ready);
    assert.deepEqual(await page.evaluate(() => bookmark),recovered);
    console.log('Existing 8,000-tap save, interruption/explosion, dead reload, restart, advancement, and legacy recovery passed.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode=1; server.close(); });
