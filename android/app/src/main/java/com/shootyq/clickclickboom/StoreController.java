package com.shootyq.clickclickboom;

import android.app.Activity;
import android.content.SharedPreferences;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import java.util.List;

/** One non-consumable purchase, restored from Google Play; game saves never grant ownership. */
final class StoreController {
    private final Activity activity;
    private final Runnable changed;
    private final SharedPreferences preferences;
    private final BillingClient billing;
    private ProductDetails product;
    private ProductDetails.OneTimePurchaseOfferDetails offer;
    private boolean connecting, closed, querying, restoring, busy, pending;
    private boolean ownershipChecked;
    private long ownershipGeneration;
    private boolean adsRemoved;
    private String message = "Connecting to Google Play…";

    StoreController(Activity activity, Runnable changed) {
        this.activity = activity;
        this.changed = changed;
        preferences = activity.getSharedPreferences("splat.store", Activity.MODE_PRIVATE);
        adsRemoved = preferences.getBoolean("adsRemoved", false);
        billing = BillingClient.newBuilder(activity)
                .setListener((result, purchases) -> ui(() -> purchasesUpdated(result, purchases)))
                .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
                .enableAutoServiceReconnection().build();
    }

    boolean adsRemoved() { return adsRemoved; }
    boolean ownershipChecked() { return ownershipChecked; }
    boolean busy() { return busy || restoring; }
    boolean purchaseSheetOpen() { return busy; }
    boolean canBuy() { return billing.isReady() && offer != null && ownershipChecked && !querying && !busy() && !pending && !adsRemoved; }
    String price() { return offer == null ? "" : offer.getFormattedPrice(); }
    String message() { return message; }
    boolean configured() { return !BuildConfig.BILLING_PUBLIC_KEY.isEmpty(); }

    private void ui(Runnable action) { activity.runOnUiThread(() -> { if (!closed) action.run(); }); }

    void start() {
        if (closed) return;
        if (!configured()) {
            ownershipChecked = true;
            message = "Purchases aren't enabled in this test build. No charges.";
            changed.run();
            return;
        }
        if (billing.isReady()) {
            refreshPurchases();
            loadProduct();
            return;
        }
        if (connecting) return;
        connecting = true;
        message = "Connecting to Google Play…";
        changed.run();
        billing.startConnection(new BillingClientStateListener() {
            @Override public void onBillingSetupFinished(BillingResult result) {
                ui(() -> {
                    connecting = false;
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        refreshPurchases();
                        loadProduct();
                    } else unavailable("Google Play is unavailable. You can keep playing offline.");
                });
            }
            @Override public void onBillingServiceDisconnected() {
                ui(() -> unavailable("Google Play disconnected. Try Restore purchases to reconnect."));
            }
        });
    }

    private void unavailable(String text) {
        ownershipChecked = true;
        connecting = false;
        querying = false;
        restoring = false;
        busy = false;
        message = text;
        changed.run();
    }

    private void loadProduct() {
        QueryProductDetailsParams.Product item = QueryProductDetailsParams.Product.newBuilder()
                .setProductId(BuildConfig.REMOVE_ADS_PRODUCT_ID).setProductType(BillingClient.ProductType.INAPP).build();
        billing.queryProductDetailsAsync(QueryProductDetailsParams.newBuilder().setProductList(List.of(item)).build(),
                (result, details) -> ui(() -> {
                    product = null;
                    offer = null;
                    if (result.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        for (ProductDetails candidate : details.getProductDetailsList()) {
                            if (BuildConfig.REMOVE_ADS_PRODUCT_ID.equals(candidate.getProductId())) {
                                List<ProductDetails.OneTimePurchaseOfferDetails> offers = candidate.getOneTimePurchaseOfferDetailsList();
                                if (offers != null) {
                                    for (ProductDetails.OneTimePurchaseOfferDetails eligible : offers) {
                                        if (eligible.getRentalDetails() == null) {
                                            product = candidate;
                                            offer = eligible;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }
                    if (offer == null && !adsRemoved) message = "Remove Ads isn't available from Google Play right now.";
                    else if (!busy() && !pending && !adsRemoved) message = "One payment. No subscription.";
                    changed.run();
                }));
    }

    void restore() {
        if (closed || busy || restoring) return;
        if (!configured()) { start(); return; }
        restoring = true;
        message = "Checking purchases with Google Play…";
        changed.run();
        start();
    }

    private void refreshPurchases() {
        if (querying || closed) return;
        querying = true;
        long generation = ownershipGeneration;
        billing.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build(),
                (result, purchases) -> ui(() -> {
                    querying = false;
                    ownershipChecked = true;
                    boolean explicitlyRestored = restoring;
                    restoring = false;
                    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        // A network/store failure must not take ad-free access away from an existing buyer.
                        message = "Couldn't check purchases. Your saved ad-free status is unchanged.";
                        changed.run();
                        return;
                    }
                    boolean found = false;
                    boolean invalid = false;
                    pending = false;
                    for (Purchase purchase : purchases) {
                        if (!purchase.getProducts().contains(BuildConfig.REMOVE_ADS_PRODUCT_ID)) continue;
                        if (!verified(purchase)) { invalid = true; continue; }
                        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                            found = true;
                            acknowledge(purchase);
                        } else if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) pending = true;
                    }
                    // An authoritative successful empty query also handles refunds/revocations.
                    if (!invalid && (found || generation == ownershipGeneration)) setOwned(found);
                    if (adsRemoved) message = "Ads removed. Thank you for backing the blob!";
                    else if (pending) message = "Payment pending. Ads will be removed when Google Play confirms it.";
                    else if (invalid) message = "Couldn't verify the purchase. Please try Restore purchases again.";
                    else if (explicitlyRestored) message = "No Remove Ads purchase found on this Google Play account.";
                    else if (offer != null) message = "One payment. No subscription.";
                    changed.run();
                }));
    }

    private boolean verified(Purchase purchase) {
        return BuildConfig.APPLICATION_ID.equals(purchase.getPackageName())
                && !purchase.getPurchaseToken().isEmpty()
                && PurchaseVerifier.verify(BuildConfig.BILLING_PUBLIC_KEY, purchase.getOriginalJson(), purchase.getSignature());
    }

    private void setOwned(boolean owned) {
        adsRemoved = owned;
        ownershipGeneration++;
        preferences.edit().putBoolean("adsRemoved", owned).apply();
    }

    private void acknowledge(Purchase purchase) {
        if (purchase.isAcknowledged()) return;
        billing.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(purchase.getPurchaseToken()).build(),
                result -> ui(() -> {
                    if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) {
                        message = "Ads removed. Connect to Google Play again soon to finish confirming your purchase.";
                        changed.run();
                    }
                }));
        // Unacknowledged purchases are retried on every successful ownership refresh.
    }

    void buy() {
        if (closed || busy() || pending) return;
        if (adsRemoved) { message = "You've already removed ads. Thank you!"; changed.run(); return; }
        if (!canBuy()) { start(); return; }
        busy = true;
        message = "Opening Google Play…";
        changed.run();
        BillingFlowParams.ProductDetailsParams item = BillingFlowParams.ProductDetailsParams.newBuilder()
                .setProductDetails(product).setOfferToken(offer.getOfferToken()).build();
        BillingResult result = billing.launchBillingFlow(activity,
                BillingFlowParams.newBuilder().setProductDetailsParamsList(List.of(item)).build());
        if (result.getResponseCode() != BillingClient.BillingResponseCode.OK) purchasesUpdated(result, null);
    }

    private void purchasesUpdated(BillingResult result, List<Purchase> purchases) {
        busy = false;
        switch (result.getResponseCode()) {
            case BillingClient.BillingResponseCode.OK:
                if (purchases != null) {
                    for (Purchase purchase : purchases) {
                        if (!purchase.getProducts().contains(BuildConfig.REMOVE_ADS_PRODUCT_ID) || !verified(purchase)) continue;
                        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
                            setOwned(true);
                            pending = false;
                            acknowledge(purchase);
                        } else if (purchase.getPurchaseState() == Purchase.PurchaseState.PENDING) pending = true;
                    }
                }
                message = adsRemoved ? "Ads removed. Thank you for backing the blob!"
                        : pending ? "Payment pending. Ads will be removed when Google Play confirms it."
                        : "Couldn't verify the purchase. Try Restore purchases.";
                break;
            case BillingClient.BillingResponseCode.USER_CANCELED:
                message = "Purchase cancelled. Back to squishing.";
                break;
            case BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED:
                restore();
                return;
            default:
                message = "Purchase couldn't finish. Please try again through Google Play.";
        }
        changed.run();
    }

    void close() { if (closed) return; closed = true; billing.endConnection(); }
}
