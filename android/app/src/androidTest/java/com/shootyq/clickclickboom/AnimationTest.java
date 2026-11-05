package com.shootyq.clickclickboom;

import android.content.Context;
import android.webkit.WebView;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Checks actual WebView canvas pixels at the formerly blank animation boundary. */
@RunWith(AndroidJUnit4.class)
public class AnimationTest {
    private WebView game;
    private String js(String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> game.evaluateJavascript(script, result::complete));
        return result.get(15, TimeUnit.SECONDS);
    }
    @Test(timeout = 90000) public void tapsNeverClearTheBlobAtAnimationBoundaries() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        context.getSharedPreferences("splat.store", Context.MODE_PRIVATE).edit().putBoolean("adsRemoved", true).commit();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            AtomicReference<WebView> reference = new AtomicReference<>();
            scenario.onActivity(activity -> reference.set(activity.findViewById(R.id.game_webview)));
            game = reference.get();
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(60);
            while (!"true".equals(js("typeof ready!=='undefined'&&ready&&blobRenderer.hasFrame"))) {
                assertTrue("Blob did not paint", System.nanoTime() < deadline);
                Thread.sleep(100);
            }
            String savedGame = js("localStorage.getItem('clickclickboom.v1')");
            try {
                String script = "(()=>{const raf=window.requestAnimationFrame,random=Math.random;let minOpaque=Infinity,minRed=Infinity;"
                        + "const check=()=>{const p=ctx.getImageData(0,0,384,384).data;let a=0,r=0;for(let i=0;i<p.length;i+=4){if(p[i+3]>128)a++;if(p[i+3]>190&&p[i]>120&&p[i+1]<115&&p[i+2]<115)r++}minOpaque=Math.min(minOpaque,a);minRed=Math.min(minRed,r)};"
                        + "try{window.requestAnimationFrame=()=>0;Math.random=()=>.99;sound.setEnabled(false);state=BlobGame.restore({run:0});navigate('game');"
                        + "for(let i=0;i<30;i++){tap();draw(started-.1);check();draw(started+32.5);check();draw(started+100);check()}"
                        + "draw(started+1000);check();const score=state.run;"
                        + "Math.random=()=>0;tap();draw(started+780);const p=ctx.getImageData(0,0,384,384).data;let puddles=0;for(let i=3;i<p.length;i+=4)if(p[i]>128)puddles++;"
                        + "return{minOpaque,minRed,score,puddles,dead:state.status==='dead'}"
                        + "}finally{window.requestAnimationFrame=raf;Math.random=random}})()";
                JSONObject result = new JSONObject(js(script));
                assertTrue("Transparent frame: " + result, result.getInt("minOpaque") > 25000);
                assertTrue("Blob lost its color: " + result, result.getInt("minRed") > 12000);
                assertEquals("Rapid taps must still score", 30, result.getInt("score"));
                assertTrue("Explosion must end in puddles", result.getBoolean("dead") && result.getInt("puddles") < 25000);
            } finally {
                js("(()=>{const prior=" + savedGame + ";if(prior===null)localStorage.removeItem('clickclickboom.v1');else localStorage.setItem('clickclickboom.v1',prior);return true})()");
            }

        } finally {
            context.getSharedPreferences("splat.store", Context.MODE_PRIVATE).edit().clear().commit();
        }
    }
}
