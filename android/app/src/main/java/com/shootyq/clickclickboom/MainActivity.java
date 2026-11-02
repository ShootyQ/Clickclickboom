package com.shootyq.clickclickboom;

import android.annotation.SuppressLint;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import java.io.IOException;
import java.nio.charset.StandardCharsets;

/** Offline Android host. The bundled game owns gameplay and local saves. */
public final class MainActivity extends ComponentActivity {
    private WebView game;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int cream = Color.rgb(255, 244, 223);
        getWindow().setStatusBarColor(cream);
        getWindow().setNavigationBarColor(cream);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        FrameLayout root = new FrameLayout(this);
        root.setBackgroundColor(cream);
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= 30) {
                android.graphics.Insets bars = insets.getInsets(
                        WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                view.setPadding(bars.left, bars.top, bars.right, bars.bottom);
            } else {
                view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                        insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            }
            return insets.consumeSystemWindowInsets();
        });
        game = new WebView(this);
        game.setBackgroundColor(cream);
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        WebSettings settings = game.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setBlockNetworkLoads(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setSupportMultipleWindows(false);
        game.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // No external navigation or remote game content in the offline test build.
                return true;
            }
        });
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        root.addView(game, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.requestApplyInsets();
        try (java.io.InputStream stream = getAssets().open("index.html")) {
            java.io.ByteArrayOutputStream buffer = new java.io.ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int count;
            while ((count = stream.read(chunk)) != -1) buffer.write(chunk, 0, count);
            String html = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
            // A stable HTTPS origin gives localStorage a consistent identity without file access.
            game.loadDataWithBaseURL("https://appassets.androidplatform.net/", html,
                    "text/html", "UTF-8", null);
        } catch (IOException error) {
            throw new IllegalStateException("Bundled game is missing", error);
        }
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleBack(); }
        });
    }

    private void handleBack() {
        game.evaluateJavascript("window.handleAndroidBack ? window.handleAndroidBack() : false",
                handled -> { if (!"true".equals(handled)) finish(); });
    }

    @Override protected void onPause() {
        game.onPause();
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (game != null) game.onResume();
    }

    @Override protected void onDestroy() {
        game.destroy();
        super.onDestroy();
    }
}
