const assert = require('node:assert/strict');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '../dist');
const server = http.createServer(async (request, response) => {
  try {
    const file = path.join(root, request.url === '/' ? 'index.html' : request.url.split('?')[0]);
    const mime = {'.html':'text/html', '.png':'image/png', '.ttf':'font/ttf', '.wav':'audio/wav', '.mp3':'audio/mpeg'};
    response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
    response.end(await fs.readFile(file));
  } catch (_) { response.writeHead(404); response.end(); }
});
(async () => {
  await new Promise(resolve => server.listen(8779, resolve));
  const browser = await chromium.launch({executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args:['--no-sandbox']});
  try {
    // Heights are the game viewport AFTER a native top banner has consumed 50–90 px.
    for (const [width, height] of [[320,478], [360,550], [390,754], [412,825], [667,285], [844,300]]) {
      const page = await browser.newPage({viewport:{width, height}});
      await page.addInitScript(() => {
        window.storeCalls = [];
        window.SplatStore = {postMessage: action => window.storeCalls.push(action)};
      });
      await page.goto('http://localhost:8779');
      await page.evaluate(() => document.fonts.ready);
      assert.deepEqual(await page.evaluate(() => storeCalls), ['ready']);
      await page.evaluate(() => SplatNative.applyState({native:true, canBuy:true, price:'$1.99', privacyRequired:true,
        message:'One payment. No subscription.'}));
      assert.equal(await page.locator('#ad-slot').isVisible(), false);
      await page.locator('#ads-button').click();
      assert.equal(await page.locator('#buy-remove-ads').textContent(), 'Remove Ads · $1.99');
      await page.locator('#buy-remove-ads').click();
      assert.equal(await page.evaluate(() => store.state.adsRemoved), false);
      await page.evaluate(() => SplatNative.applyState({native:true, canBuy:false, privacyRequired:true,
        message:'Payment pending. Ads will be removed when Google Play confirms it.'}));
      assert.equal(await page.locator('#buy-remove-ads').isDisabled(), true);
      await page.locator('#restore-purchases').click();
      await page.evaluate(() => SplatNative.applyState({native:true, adsRemoved:true, privacyRequired:true,
        message:'Ads removed. Thank you for backing the blob!'}));
      assert.equal(await page.locator('#buy-remove-ads').isDisabled(), true);
      assert.equal(await page.locator('#ads-button').textContent(), 'Ads removed ✓');
      await page.locator('#audio-open').click();
      await page.locator('#privacy-options').click();
      await page.locator('#privacy-policy-link').click();
      for (const selector of ['#privacy-options', '#sound-toggle', '#audio-close', '#music-volume', '#sfx-volume', '#privacy-policy-link']) {
        const box = await page.locator(selector).boundingBox();
        assert(box && box.y >= 0 && box.y + box.height <= height + 1, `${width}x${height}: ${selector} outside viewport`);
      }
      assert.deepEqual(await page.evaluate(() => storeCalls), ['ready', 'buy', 'restore', 'privacy', 'policy']);
      await page.evaluate(() => handleAndroidBack());
      for (const screen of ['menu','ads','stats','game']) {
        await page.evaluate(name => navigate(name), screen);
        for (const kind of screen === 'game' ? ['story','aside','resumed','dead','won'] : ['default']) {
          if (screen === 'game') await page.evaluate(kind => {
            state.status = ['dead','won'].includes(kind) ? kind : 'alive';
            render(); conversationState(kind);
            $('speech').textContent = stories.flatMap(story => story.beats).reduce((a,b) => a.text.length > b.text.length ? a : b).text;
            nextLineAt = performance.now() + 999999;
          }, kind);
          const issues = await page.evaluate(() => {
            const issues = [];
            for (const element of document.querySelectorAll('main button, main .speech, main .stat-row, #ads-screen .card p')) {
              const rect = element.getBoundingClientRect();
              if (!rect.width || !rect.height) continue;
              if (rect.top < -1 || rect.bottom > innerHeight + 1 || rect.left < -1 || rect.right > innerWidth + 1)
                issues.push(`${element.id || element.className} outside viewport: ${rect.bottom}`);
              if (element.matches('.speech, .card p')) {
                const range = document.createRange(); range.selectNodeContents(element);
                const text = range.getBoundingClientRect();
                if (text.bottom > rect.bottom + 1 || text.top < rect.top - 1) issues.push(`${element.id || element.className} text clipped`);
              }
            }
            return issues;
          });
          assert.deepEqual(issues, [], `${width}x${height} ${screen}/${kind}`);
        }
      }
      await page.close();
    }
    console.log('Native store UI, privacy controls, and banner-reduced layouts passed at six phone sizes.');
  } finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(error => { console.error(error); process.exitCode = 1; server.close(); });
