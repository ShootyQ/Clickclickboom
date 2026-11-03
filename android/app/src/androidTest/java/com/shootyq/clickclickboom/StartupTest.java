package com.shootyq.clickclickboom;

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

/** Reaches real rendered HTML and decoded local SFX, not just an open Activity. */
@RunWith(AndroidJUnit4.class)
public class StartupTest {
    @Test(timeout = 90000) public void launchesMenuAndLocalAssets() throws Exception {
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            AtomicReference<WebView> reference = new AtomicReference<>();
            scenario.onActivity(activity -> reference.set(activity.findViewById(R.id.game_webview)));
            assertNotNull("Game WebView was not created", reference.get());
            String snapshot = "";
            long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(60);
            while (System.nanoTime() < deadline) {
                CompletableFuture<String> result = new CompletableFuture<>();
                InstrumentationRegistry.getInstrumentation().runOnMainSync(() ->
                    reference.get().evaluateJavascript(
                        "document.title+'|'+location.origin+'|'+"
                        + "(document.querySelector('.menu-title img')?.naturalWidth||0)+'|'+"
                        + "(document.documentElement.classList.contains('native-host')?'STORE':'WAIT')+'|'+"
                        + "(typeof ready!=='undefined'&&ready?'READY':'WAIT')+'|'+"
                        + "(typeof sound!=='undefined'?Object.keys(sound.buffers).length:0)", result::complete));
                String raw = result.get(5, TimeUnit.SECONDS);
                if (!"null".equals(raw)) snapshot = new JSONArray("[" + raw + "]").getString(0);
                if (snapshot.endsWith("|READY|3") && snapshot.contains("|1536|STORE|")) break;
                Thread.sleep(250);
            }
            assertTrue("Game did not finish loading: " + snapshot, snapshot.endsWith("|READY|3"));
            assertTrue(snapshot.contains("Squish Squish Splat"));
            assertTrue("Artwork did not load: " + snapshot, snapshot.contains("|1536|"));
            assertTrue("Native store bridge did not load: " + snapshot, snapshot.contains("|STORE|"));
            assertTrue("Save origin changed: " + snapshot, snapshot.contains("https://appassets.androidplatform.net"));
        }
    }
}
