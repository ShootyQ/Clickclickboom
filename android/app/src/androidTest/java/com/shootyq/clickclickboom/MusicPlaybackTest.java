package com.shootyq.clickclickboom;

import android.content.Context;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONArray;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Uses real Android taps and media playback, including a complete death-song loop. */
@RunWith(AndroidJUnit4.class)
public class MusicPlaybackTest {
    private WebView game;
    private String js(String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> game.evaluateJavascript(script, result::complete));
        return result.get(10, TimeUnit.SECONDS);
    }
    private void await(String condition, int seconds) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(seconds);
        while (!"true".equals(js(condition))) {
            assertTrue("Playback condition timed out: " + condition, System.nanoTime() < deadline);
            Thread.sleep(100);
        }
    }
    private void tap(String id) throws Exception {
        JSONArray point = new JSONArray(js("(()=>{const r=document.getElementById('" + id + "').getBoundingClientRect();return [(r.left+r.width/2)*devicePixelRatio,(r.top+r.height/2)*devicePixelRatio]})()"));
        int[] origin = new int[2];
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> game.getLocationOnScreen(origin));
        float x = origin[0] + (float) point.getDouble(0), y = origin[1] + (float) point.getDouble(1);
        long now = SystemClock.uptimeMillis();
        MotionEvent down = MotionEvent.obtain(now, now, MotionEvent.ACTION_DOWN, x, y, 0);
        MotionEvent up = MotionEvent.obtain(now, now + 50, MotionEvent.ACTION_UP, x, y, 0);
        try {
            InstrumentationRegistry.getInstrumentation().sendPointerSync(down);
            InstrumentationRegistry.getInstrumentation().sendPointerSync(up);
        } finally { down.recycle(); up.recycle(); }
    }
    private void explode() throws Exception {
        js("window.musicTestRandom=Math.random;Math.random=()=>0;true");
        tap("blob");
        await("state.status==='dead'&&sound.musicMode==='death'&&!sound.deathMusic.paused&&sound.deathMusic.currentTime>0.1", 15);
        js("Math.random=window.musicTestRandom;true");
        assertEquals("true", js("sound.music.paused&&sound.deathMusic.loop"));
    }
    @Test(timeout = 150000) public void explosionLoopsUntilMenuOrNewGame() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        context.getSharedPreferences("splat.store", Context.MODE_PRIVATE).edit().putBoolean("adsRemoved", true).commit();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            AtomicReference<WebView> reference = new AtomicReference<>();
            scenario.onActivity(activity -> reference.set(activity.findViewById(R.id.game_webview)));
            game = reference.get();
            await("typeof ready!=='undefined'&&ready&&document.fonts.status==='loaded'", 60);
            tap("play-button");
            await("!sound.music.paused&&sound.music.currentTime>0.1", 20);
            assertEquals("true", js("sound.music.src.endsWith('/slimey-breeze.mp3')&&sound.tracks.length===3"));
            explode();
            // Observe an actual end-to-start wrap instead of synthesizing an ended event.
            await("sound.deathMusic.currentTime>25", 40);
            await("sound.deathMusic.currentTime<5&&!sound.deathMusic.paused", 15);
            assertEquals("true", js("sound.music.paused&&sound.musicMode==='death'"));
            tap("game-menu");
            await("sound.musicMode==='main'&&!sound.music.paused&&sound.deathMusic.paused&&sound.deathMusic.currentTime===0", 10);
            tap("play-button");
            tap("restart");
            await("state.status==='alive'", 10);
            explode();
            await("!document.getElementById('restart').disabled", 5);
            tap("restart");
            await("state.status==='alive'&&sound.musicMode==='main'&&!sound.music.paused&&sound.deathMusic.paused&&sound.deathMusic.currentTime===0", 10);
        } finally {
            context.getSharedPreferences("splat.store", Context.MODE_PRIVATE).edit().clear().commit();
        }
    }
}
