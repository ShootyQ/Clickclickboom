package com.shootyq.clickclickboom;

import android.annotation.SuppressLint;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.webkit.WebViewAssetLoader;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;
import android.view.WindowInsets;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebResourceError;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import android.view.Gravity;
import java.io.ByteArrayInputStream;
import java.util.Collections;

/** Offline Android host. The bundled game owns gameplay and local saves. */
public final class MainActivity extends ComponentActivity {
    private WebView game;
    private FrameLayout root;

    @SuppressLint("SetJavaScriptEnabled")
    @Override public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        int cream = Color.rgb(255, 244, 223);
        getWindow().setStatusBarColor(cream);
        getWindow().setNavigationBarColor(cream);
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
        root = new FrameLayout(this);
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
        game.setId(R.id.game_webview);
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
        WebViewAssetLoader assets = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();
        game.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = assets.shouldInterceptRequest(request.getUrl());
                if (local != null) return local;
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // No external navigation or remote game content in the offline test build.
                return true;
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) {
                    android.util.Log.e("SplatStartup", "Main page failed, code=" + error.getErrorCode());
                    showLoadError();
                }
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                android.util.Log.e("SplatStartup", "Renderer exited, crash=" + detail.didCrash());
                showLoadError();
                return true;
            }
        });
        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        root.addView(game, new FrameLayout.LayoutParams(-1, -1));
        setContentView(root);
        root.requestApplyInsets();
        // Stream local files instead of copying a huge base64 HTML string through
        // the Java heap and WebView IPC. The origin stays unchanged for saves.
        game.loadUrl("https://appassets.androidplatform.net/assets/index.html");
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleBack(); }
        });
    }

    private void handleBack() {
        if (game == null) { finish(); return; }
        game.evaluateJavascript("window.handleAndroidBack ? window.handleAndroidBack() : false",
                handled -> { if (!"true".equals(handled)) finish(); });
    }

    private void showLoadError() {
        if (game != null) {
            root.removeView(game);
            game.destroy();
            game = null;
        }
        LinearLayout panel = new LinearLayout(this);
        panel.setOrientation(LinearLayout.VERTICAL);
        panel.setGravity(Gravity.CENTER);
        panel.setPadding(32, 32, 32, 32);
        TextView message = new TextView(this);
        message.setText(R.string.game_load_failed);
        message.setGravity(Gravity.CENTER);
        message.setTextSize(18);
        Button retry = new Button(this);
        retry.setText(R.string.retry_game);
        retry.setOnClickListener(view -> recreate());
        panel.addView(message);
        panel.addView(retry);
        root.removeAllViews();
        root.addView(panel, new FrameLayout.LayoutParams(-1, -1));
    }

    @Override protected void onPause() {
        if (game != null) {
            game.evaluateJavascript("window.setAudioBackgrounded && window.setAudioBackgrounded(true)", null);
            game.onPause();
        }
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        if (game != null) {
            game.onResume();
            game.evaluateJavascript("window.setAudioBackgrounded && window.setAudioBackgrounded(false)", null);
        }
    }

    @Override protected void onDestroy() {
        if (game != null) game.destroy();
        super.onDestroy();
    }
}
