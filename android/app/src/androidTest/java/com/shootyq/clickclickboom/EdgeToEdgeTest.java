package com.shootyq.clickclickboom;

import android.content.Context;
import android.content.pm.ActivityInfo;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.view.View;
import android.webkit.WebView;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsCompat;
import androidx.test.core.app.ActivityScenario;
import androidx.test.ext.junit.runners.AndroidJUnit4;
import androidx.test.platform.app.InstrumentationRegistry;
import org.junit.Test;
import org.junit.runner.RunWith;
import java.io.File;
import java.io.FileOutputStream;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import static org.junit.Assert.*;

/** Real window geometry, including native banner space, rotation and display cutouts. */
@RunWith(AndroidJUnit4.class)
public class EdgeToEdgeTest {
    private WebView game;
    private FrameLayout root, banner;

    private String js(String script) throws Exception {
        CompletableFuture<String> result = new CompletableFuture<>();
        InstrumentationRegistry.getInstrumentation().runOnMainSync(() -> game.evaluateJavascript(script, result::complete));
        return result.get(10, TimeUnit.SECONDS);
    }

    private void ready(ActivityScenario<MainActivity> scenario, boolean landscape) throws Exception {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(60);
        while (true) {
            boolean[] correctShape = {false};
            scenario.onActivity(activity -> {
                game = activity.findViewById(R.id.game_webview);
                root = activity.findViewById(R.id.game_root);
                banner = activity.findViewById(R.id.banner_container);
                correctShape[0] = root.getWidth() > 0 && (root.getWidth() > root.getHeight()) == landscape;
            });
            if (correctShape[0] && "true".equals(js("typeof ready!=='undefined'&&ready&&document.fonts.status==='loaded'&&document.documentElement.classList.contains('native-host')"))) return;
            assertTrue("Game did not settle after rotation", System.nanoTime() < deadline);
            Thread.sleep(150);
        }
    }

    private void painted() throws Exception {
        js("window.edgePainted=false;requestAnimationFrame(()=>requestAnimationFrame(()=>window.edgePainted=true));true");
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(10);
        while (!"true".equals(js("window.edgePainted"))) {
            assertTrue("No painted frame", System.nanoTime() < deadline);
            Thread.sleep(50);
        }
        InstrumentationRegistry.getInstrumentation().waitForIdleSync();
    }

    private void reserveBanner(ActivityScenario<MainActivity> scenario, int heightDp) throws Exception {
        scenario.onActivity(activity -> {
            banner.removeAllViews();
            int pixels = Math.round(heightDp * activity.getResources().getDisplayMetrics().density);
            banner.setLayoutParams(new LinearLayout.LayoutParams(-1, pixels));
            if (heightDp > 0) {
                // Test-only reservation: exercise both filled-banner sizes without an ad network.
                TextView placeholder = new TextView(activity);
                placeholder.setText("Advertisement · " + heightDp + " dp test reservation");
                placeholder.setTextColor(Color.DKGRAY);
                placeholder.setBackgroundColor(Color.LTGRAY);
                banner.addView(placeholder, new FrameLayout.LayoutParams(-1, -1));
                banner.setVisibility(View.VISIBLE);
            } else banner.setVisibility(View.GONE);
            ViewCompat.requestApplyInsets(root);
        });
        painted();
        scenario.onActivity(activity -> {
            WindowInsetsCompat windowInsets = ViewCompat.getRootWindowInsets(root);
            assertNotNull("No root window insets", windowInsets);
            Insets safe = windowInsets.getInsets(WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout());
            assertEquals(safe.left, root.getPaddingLeft());
            assertEquals(safe.top, root.getPaddingTop());
            assertEquals(safe.right, root.getPaddingRight());
            assertEquals(safe.bottom, root.getPaddingBottom());
            int[] rootPosition = new int[2], webPosition = new int[2], bannerPosition = new int[2];
            root.getLocationOnScreen(rootPosition);
            game.getLocationOnScreen(webPosition);
            banner.getLocationOnScreen(bannerPosition);
            int height = Math.round(heightDp * activity.getResources().getDisplayMetrics().density);
            assertEquals("Content must extend behind bars", activity.getWindow().getDecorView().getHeight(), root.getHeight());
            assertEquals(rootPosition[0] + safe.left, webPosition[0]);
            assertEquals(rootPosition[1] + safe.top + height, webPosition[1]);
            assertEquals(root.getWidth() - safe.left - safe.right, game.getWidth());
            assertEquals(rootPosition[1] + root.getHeight() - safe.bottom, webPosition[1] + game.getHeight());
            if (heightDp > 0) {
                assertEquals(height, banner.getHeight());
                assertEquals(rootPosition[1] + safe.top, bannerPosition[1]);
                assertEquals("Native ad must end above the game", webPosition[1], bannerPosition[1] + banner.getHeight());
            }
            assertTrue("Dark status icons are required over cream", WindowCompat.getInsetsController(activity.getWindow(), root).isAppearanceLightStatusBars());
            assertTrue("Dark navigation icons are required over cream", WindowCompat.getInsetsController(activity.getWindow(), root).isAppearanceLightNavigationBars());
        });
    }

    private void capture(String name) throws Exception {
        Bitmap image = InstrumentationRegistry.getInstrumentation().getUiAutomation().takeScreenshot();
        assertNotNull(image);
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        File directory = new File(context.getExternalFilesDir(null), "edge-to-edge");
        assertTrue(directory.isDirectory() || directory.mkdirs());
        try (FileOutputStream output = new FileOutputStream(new File(directory, name + ".png"))) {
            assertTrue(image.compress(Bitmap.CompressFormat.PNG, 100, output));
        } finally { image.recycle(); }
    }

    @Test(timeout = 180000) public void safeAreaContainsBannerGameAndControlsAfterRotation() throws Exception {
        Context context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        context.getSharedPreferences("splat.store", Context.MODE_PRIVATE).edit().putBoolean("adsRemoved", true).commit();
        try (ActivityScenario<MainActivity> scenario = ActivityScenario.launch(MainActivity.class)) {
            for (boolean landscape : new boolean[]{false, true}) {
                scenario.onActivity(activity -> activity.setRequestedOrientation(landscape
                        ? ActivityInfo.SCREEN_ORIENTATION_LANDSCAPE : ActivityInfo.SCREEN_ORIENTATION_PORTRAIT));
                ready(scenario, landscape);
                for (int height : new int[]{0, 50, 90}) {
                    reserveBanner(scenario, height);
                    for (String screen : new String[]{"menu", "game", "dead", "audio"}) {
                        js("sound.setEnabled(false);state=BlobGame.restore({run:0});showStory();"
                                + "$('speech').textContent='One little guy. Still in one piece.';navigate('" + (screen.equals("dead") ? "game" : screen.equals("audio") ? "menu" : screen) + "');"
                                + (screen.equals("dead") ? "state.status='dead';mode='boom';started=-100000;conversationState('dead');$('speech').textContent=\"1,012 clicks. Hold that thought. I've become floor.\";render();" : "")
                                + (screen.equals("audio") ? "document.getElementById('audio-dialog').showModal();" : "") + "true");
                        painted();
                        assertEquals("Clipped controls: " + landscape + "/" + height + "/" + screen, "\"\"", js("(()=>{const bad=[];for(const e of document.querySelectorAll('main button,main .speech,dialog[open] button,dialog[open] input')){const r=e.getBoundingClientRect();if(!r.width||!r.height)continue;if(r.top<0||r.bottom>innerHeight+1||r.left<0||r.right>innerWidth+1)bad.push(e.id||e.className)}return bad.join(',')})()"));
                        if (height == 50 && screen.equals("dead")) capture(landscape ? "landscape-splat" : "portrait-splat");
                        js("if(audioDialog.open)audioDialog.close();true");
                    }
                }
            }
        } finally {
            context.getSharedPreferences("splat.store", Context.MODE_PRIVATE).edit().clear().commit();
        }
    }
}
