package com.shootyq.clickclickboom;

import android.annotation.SuppressLint;
import android.content.Intent;
import android.content.ActivityNotFoundException;
import android.net.Uri;
import android.widget.Toast;
import androidx.activity.ComponentActivity;
import androidx.activity.OnBackPressedCallback;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import androidx.webkit.WebMessageCompat;
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
import java.util.Set;
import org.json.JSONObject;

/** Local game host. Native consent, ads and billing are isolated from the game WebView. */
public final class MainActivity extends ComponentActivity {
    private static final String PRIVACY_POLICY_URL = "https://shootyq.github.io/Clickclickboom/privacy.html";
    private WebView game;
    private FrameLayout root;
    private StoreController store;
    private BannerController ads;
    private boolean pageReady, bridgeReady, foreground;

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
        LinearLayout content = new LinearLayout(this);
        content.setOrientation(LinearLayout.VERTICAL);
        FrameLayout bannerContainer = new FrameLayout(this);
        bannerContainer.setContentDescription("Advertisement");
        content.addView(bannerContainer, new LinearLayout.LayoutParams(-1, -2));
        game = new WebView(this);
        game.setId(R.id.game_webview);
        game.setBackgroundColor(cream);
        game.setOverScrollMode(View.OVER_SCROLL_NEVER);
        // Keep long presses from opening WebView selection handles or a context menu.
        game.setOnLongClickListener(view -> true);
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
            @Override public void onPageFinished(WebView view, String url) {
                if ("https://appassets.androidplatform.net/assets/index.html".equals(url)) {
                    pageReady = true;
                    publishStoreState();
                }
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                WebResourceResponse local = assets.shouldInterceptRequest(request.getUrl());
                if (local != null) return local;
                return new WebResourceResponse("text/plain", "UTF-8", 403, "Blocked",
                        Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Only the explicit public policy link opens externally; game content stays local.
                if (request.isForMainFrame() && PRIVACY_POLICY_URL.equals(request.getUrl().toString())) openPrivacyPolicy();
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
        content.addView(game, new LinearLayout.LayoutParams(-1, 0, 1));
        root.addView(content, new FrameLayout.LayoutParams(-1, -1));
        store = new StoreController(this, this::publishStoreState);
        ads = new BannerController(this, bannerContainer, this::publishStoreState);
        bridgeReady = WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(game, "SplatStore", Set.of("https://appassets.androidplatform.net"),
                    (view, message, sourceOrigin, isMainFrame, replyProxy) -> {
                        if (!isMainFrame || message.getType() != WebMessageCompat.TYPE_STRING
                                || !"https://appassets.androidplatform.net".equals(sourceOrigin.toString())) return;
                        String action = message.getData();
                        runOnUiThread(() -> {
                            if (isFinishing() || isDestroyed()) return;
                            if ("buy".equals(action)) store.buy();
                            else if ("restore".equals(action)) store.restore();
                            else if ("privacy".equals(action)) ads.showPrivacyOptions();
                            else if ("policy".equals(action)) openPrivacyPolicy();
                            else if ("ready".equals(action)) publishStoreState();
                        });
                    });
        }
        setContentView(root);
        root.requestApplyInsets();
        // Stream local files instead of copying a huge base64 HTML string through
        // the Java heap and WebView IPC. The origin stays unchanged for saves.
        game.loadUrl("https://appassets.androidplatform.net/assets/index.html");
        if (bridgeReady) root.post(store::start);
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override public void handleOnBackPressed() { handleBack(); }
        });
    }

    private void openPrivacyPolicy() {
        try { startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(PRIVACY_POLICY_URL))); }
        catch (ActivityNotFoundException exception) {
            Toast.makeText(this, "Open " + PRIVACY_POLICY_URL + " in a browser.", Toast.LENGTH_LONG).show();
        }
    }

    private void publishStoreState() {
        if (isDestroyed() || store == null || ads == null) return;
        if (bridgeReady) ads.update(store.adsRemoved(), store.ownershipChecked());
        if (!pageReady || game == null) return;
        JSONObject state = new JSONObject();
        try {
            state.put("native", true);
            state.put("adsRemoved", store.adsRemoved());
            state.put("canBuy", bridgeReady && store.canBuy());
            state.put("busy", store.busy());
            state.put("price", store.price());
            state.put("message", bridgeReady ? store.message() : "Update Android System WebView to use purchases.");
            state.put("privacyRequired", bridgeReady && ads.privacyRequired());
            state.put("testAds", BuildConfig.TEST_ADS);
        } catch (org.json.JSONException exception) { throw new IllegalStateException(exception); }
        game.evaluateJavascript("window.SplatNative && window.SplatNative.applyState(" + state + ")", null);
        updateAudioBackground();
    }

    private void updateAudioBackground() {
        if (game != null && pageReady) game.evaluateJavascript(
                "window.setAudioBackgrounded && window.setAudioBackgrounded(" +
                (!foreground || (store != null && store.purchaseSheetOpen()) || (ads != null && ads.modalOpen())) + ")", null);
    }

    private void handleBack() {
        if (game == null) { finish(); return; }
        game.evaluateJavascript("window.handleAndroidBack ? window.handleAndroidBack() : false",
                handled -> { if (!"true".equals(handled)) finish(); });
    }

    private void showLoadError() {
        if (game != null) {
            ((android.view.ViewGroup) game.getParent()).removeView(game);
            game.destroy();
            game = null;
        }
        pageReady = false;
        if (ads != null) ads.close();
        if (store != null) store.close();
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
        foreground = false;
        if (ads != null) ads.pause();
        if (game != null) {
            game.evaluateJavascript("window.setAudioBackgrounded && window.setAudioBackgrounded(true)", null);
            game.onPause();
        }
        super.onPause();
    }

    @Override protected void onResume() {
        super.onResume();
        foreground = true;
        if (game != null) {
            game.onResume();
            updateAudioBackground();
        }
        if (ads != null) ads.resume();
        if (store != null && bridgeReady) store.start();
    }

    @Override protected void onDestroy() {
        if (ads != null) ads.close();
        if (store != null) store.close();
        if (game != null) game.destroy();
        super.onDestroy();
    }
}
