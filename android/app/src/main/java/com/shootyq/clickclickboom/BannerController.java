package com.shootyq.clickclickboom;

import android.app.Activity;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.widget.FrameLayout;
import com.google.android.gms.ads.AdListener;
import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

/** Native anchored banner. No interstitials, rewarded ads, or game-network access. */
final class BannerController {
    private final Activity activity;
    private final FrameLayout container;
    private final Runnable changed;
    private final ConsentInformation consent;
    private AdView banner;
    private boolean removed, checked, consentRequested, consentBusy, initialized, initializing, closed;
    private boolean loading, loaded, adOverlayOpen;
    private long lastRequest;

    BannerController(Activity activity, FrameLayout container, Runnable changed) {
        this.activity = activity;
        this.container = container;
        this.changed = changed;
        consent = UserMessagingPlatform.getConsentInformation(activity);
        container.setVisibility(View.GONE);
    }

    boolean privacyRequired() {
        return consent.getPrivacyOptionsRequirementStatus() == ConsentInformation.PrivacyOptionsRequirementStatus.REQUIRED;
    }
    boolean modalOpen() { return consentBusy || adOverlayOpen; }
    private void ui(Runnable action) { activity.runOnUiThread(() -> { if (!closed) action.run(); }); }

    void update(boolean adsRemoved, boolean ownershipChecked) {
        removed = adsRemoved;
        checked = ownershipChecked;
        if (closed) return;
        if (removed) { destroyBanner(); return; }
        if (!checked) return;
        if (!consentRequested) requestConsent();
        else requestBanner();
    }

    private void requestConsent() {
        consentRequested = true;
        consentBusy = true;
        changed.run();
        consent.requestConsentInfoUpdate(activity, new ConsentRequestParameters.Builder().build(),
                () -> ui(() -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, error -> ui(() -> {
                    consentBusy = false;
                    changed.run();
                    requestBanner();
                }))), error -> ui(() -> {
                    // A stored valid decision may still allow requests; otherwise leave the game ad-free.
                    consentBusy = false;
                    changed.run();
                    requestBanner();
                }));
    }

    void showPrivacyOptions() {
        if (closed || consentBusy || !privacyRequired()) return;
        consentBusy = true;
        destroyBanner();
        changed.run();
        UserMessagingPlatform.showPrivacyOptionsForm(activity, error -> ui(() -> {
            consentBusy = false;
            changed.run();
            requestBanner();
        }));
    }

    private void requestBanner() {
        if (closed || removed || !checked || consentBusy || !consent.canRequestAds()) return;
        if (!initialized) {
            if (!initializing) {
                initializing = true;
                // SDK initialization can perform disk/network work; keep it off the UI thread.
                new Thread(() -> MobileAds.initialize(activity, status -> ui(() -> {
                    initializing = false;
                    initialized = true;
                    requestBanner();
                })), "splat-ads-init").start();
            }
            return;
        }
        if (banner != null) return;
        int pixels = ((View) container.getParent()).getWidth();
        if (pixels <= 0) { container.post(this::requestBanner); return; }
        int widthDp = (int) (pixels / activity.getResources().getDisplayMetrics().density);
        AdSize size = AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, widthDp);
        banner = new AdView(activity);
        banner.setAdSize(size);
        banner.setAdUnitId(BuildConfig.BANNER_AD_UNIT_ID);
        FrameLayout.LayoutParams params = new FrameLayout.LayoutParams(-2, size.getHeightInPixels(activity), Gravity.CENTER);
        container.addView(banner, params);
        AdView requestedBanner = banner;
        banner.setAdListener(new AdListener() {
            @Override public void onAdLoaded() {
                if (closed || removed || banner != requestedBanner) return;
                loading = false;
                loaded = true;
                container.setVisibility(View.VISIBLE);
            }
            @Override public void onAdFailedToLoad(LoadAdError error) {
                if (closed || banner != requestedBanner) return;
                loading = false;
                loaded = false;
                container.setVisibility(View.GONE);
            }
            @Override public void onAdOpened() { adOverlayOpen = true; activity.runOnUiThread(changed); }
            @Override public void onAdClosed() { adOverlayOpen = false; activity.runOnUiThread(changed); }
        });
        load();
    }

    private void load() {
        if (banner == null || loading || removed || !consent.canRequestAds()) return;
        loading = true;
        lastRequest = SystemClock.elapsedRealtime();
        banner.loadAd(new AdRequest.Builder().build());
    }

    void pause() { if (banner != null) banner.pause(); }
    void resume() {
        if (banner != null) {
            banner.resume();
            if (!loaded && !loading && SystemClock.elapsedRealtime() - lastRequest >= 60000) load();
        }
    }
    private void destroyBanner() {
        container.setVisibility(View.GONE);
        if (banner != null) { banner.destroy(); container.removeAllViews(); banner = null; }
        loading = false;
        loaded = false;
    }
    void close() { closed = true; destroyBanner(); }
}
