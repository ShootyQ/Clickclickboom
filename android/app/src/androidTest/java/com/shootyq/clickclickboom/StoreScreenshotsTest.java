package com.shootyq.clickclickboom;

import android.content.Context;
import android.graphics.Bitmap;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Store captures from the real Android renderer; no test hooks ship in the app. */
@RunWith(AndroidJUnit4.class)
public class StoreScreenshotsTest {
    private WebView game;

    private String js(String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> game.evaluateJavascript(script, result::complete));
        return result.get(10, TimeUnit.SECONDS);
    }

    private void settle() throws Exception {
        // Wait for an actual painted frame after layout and sprite changes.
        js("window.capturePainted=false;requestAnimationFrame(()=>requestAnimationFrame(()=>window.capturePainted=true));true");
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (!"true".equals(js("window.capturePainted"))) {
            assertTrue("Renderer did not paint", System.nanoTime() < deadline);
            Thread.sleep(50);
        }
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
    }

    private void capture(String name) throws Exception {
        settle();
        assertEquals("Game viewport overflow", "true", js("document.documentElement.scrollHeight<=innerHeight+1"));
        assertEquals("HTML banner should be hidden", "true", js("getComputedStyle(document.getElementById('ad-slot')).display==='none'"));
        Bitmap screenshot = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull("Android screenshot failed", screenshot);
        assertEquals(1080, screenshot.getWidth());
        assertEquals(1920, screenshot.getHeight());
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        File directory = new File(context.getExternalFilesDir(null), "store-screenshots");
        assertTrue(directory.isDirectory() || directory.mkdirs());
        try (FileOutputStream output = new FileOutputStream(new File(directory, name))) {
            assertTrue(screenshot.compress(Bitmap.CompressFormat.PNG, 100, output));
        } finally { screenshot.recycle(); }
    }

    @Test(timeout = 120000) public void captureThreeGameplayStates() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        // This is a fresh emulator's debug-only test preference, never a real purchase.
        context.getSharedPreferences("splat.store", Context.MODE_PRIVATE).edit().putBoolean("adsRemoved", true).commit();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            AtomicReference<WebView> reference = new AtomicReference<>();
            scenario.onActivity(activity -> reference.set(activity.findViewById(R.id.game_webview)));
            game = reference.get();
            assertNotNull(game);
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(60);
            while (!"true".equals(js("typeof ready!=='undefined'&&ready&&document.fonts.status==='loaded'&&document.documentElement.classList.contains('native-host')"))) {
                assertTrue("Game did not load", System.nanoTime() < deadline);
                Thread.sleep(150);
            }
            js("sound.setEnabled(false);state=BlobGame.restore({run:1539,best:1539,lifetime:4832,deaths:3});"
                    + "bookmark={storyId:'accidentally-became-the-moon',beat:1};showStory();navigate('game');play('idle');true");
            capture("01-story.png");

            js("state=BlobGame.restore({run:1000,best:1539,lifetime:5832,deaths:3});"
                    + "bookmark={storyId:'part-of-gary',beat:stories.find(s=>s.id==='part-of-gary').beats.findIndex(b=>b.text==='WE KNOW YOU’RE THERE.')};"
                    + "showStory();interrupt(milestones['1000'][2]);render();play('nervous');true");
            capture("02-interruption.png");

            js("window.captureRandom=Math.random;Math.random=()=>0;tap();Math.random=window.captureRandom;true");
            Thread.sleep(1400); // Capture the completed splat, with restart enabled.
            assertEquals("true", js("state.status==='dead'&&!document.getElementById('restart').disabled"));
            capture("03-splat.png");
        } finally {
            context.getSharedPreferences("splat.store", Context.MODE_PRIVATE).edit().clear().commit();
        }
    }
}
