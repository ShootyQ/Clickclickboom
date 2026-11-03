# Banner ads and Remove Ads

The game and its statistics stay on the device. Native Android code handles AdMob, Google's User Messaging Platform (UMP), and Play Billing; the game WebView still blocks remote requests and navigation. No Firebase project, game account, or leaderboard service is used.

## This build versus a launch build

The game's AdMob app ID is saved in `android/monetization.properties`. Android uses **Google's test banner ID by default**, including release/internal-testing builds. These do not earn revenue. Actual ad loading still depends on UMP allowing an ad request and the network being available; consent errors/no fill leave the game playable without a banner. Do not interpret a blank sample banner as a gameplay failure.

Purchasing is disabled until the game's **Play licensing public key** is supplied. The browser preview never offers a fake checkout. The code does not hard-code a selling price: it displays the localized price and eligible one-time offer returned by Google Play. The sample build cannot charge anyone.

## AdMob setup

1. Create/link an Android app in AdMob for `com.squishsquishsplat.myapp`.
2. Create a **banner** ad unit. This game has no interstitials or rewarded ads. Use AdMob's recommended automatic refresh configuration rather than refreshing on taps.
3. Configure and publish the appropriate messages in AdMob's **Privacy & messaging** section, including applicable European and US-state privacy messages. Set your actual privacy policy URL there. Decide and declare the intended audience accurately before launch.
4. Complete AdMob's app/store verification steps, including `app-ads.txt` on the developer website where required. Until the app is approved/linked, live serving can be limited.
5. Save the public banner ID in the configuration below. Set `SPLAT_LIVE_ADS=true` only for the production build after testing consent and billing. Debug builds always use Google's test IDs, even when release IDs are configured. For testing a release with real IDs, register your devices as test devices in AdMob; do not click live ads yourself.

UMP refreshes consent information on launch, shows a required consent form, and gates SDK initialization/banner requests on `canRequestAds()`. When privacy options are required, an **Ad privacy** button appears beside the sound toggle in audio settings. Changing a privacy decision destroys the old banner before another request. Purchasers do not request banners. No sensitive identifiers are passed from the game to the ads SDK.

The adaptive banner lives above the WebView in a native layout. Its actual height reduces the game's viewport; the HTML banner reservation becomes zero so space is not counted twice. No fill/error/owned states hide the native banner. Controls sit below it; never overlay the tap target on the banner.

## Play Console setup

1. Use the existing Play app/package `com.squishsquishsplat.myapp`.
2. Upload this billing-enabled AAB to the internal track if Play requires an uploaded billing-enabled artifact before product creation.
3. Under **Monetize with Play → Products → One-time products** (wording may vary), create product ID **`remove_ads`**. Make it a permanent, non-consumable purchase with a **buy** purchase option, set its US price to **$3.99** and configure other regions, then activate/publish it. Do not create a subscription or rental. The app never consumes this purchase.
4. Obtain the app's **base64 RSA licensing public key** from Play Console's monetization/licensing settings. It is a public key, **not** the private upload keystore, a service-account JSON, or a password.
5. Set `SPLAT_BILLING_PUBLIC_KEY` and rebuild. Purchase buttons remain disabled when Play cannot return the configured product and price.
6. Add your test Google accounts under Play Console **Settings → License testing** and add them to the internal-testing tester list. Install through the Play opt-in link using the test account. Internal-track membership alone does not make purchases free: verify the checkout explicitly says it is a **test** purchase/payment method before confirming.

## Build configuration

Save public app configuration in `android/monetization.properties`, or override with environment variables to Gradle / GitHub repository **Settings → Secrets and variables → Actions → Variables** for CI:

| Variable | Value |
| --- | --- |
| `SPLAT_ADMOB_APP_ID` | AdMob app ID (`ca-app-pub-…~…`) |
| `SPLAT_ADMOB_BANNER_ID` | Banner unit ID (`ca-app-pub-…/…`) |
| `SPLAT_BILLING_PUBLIC_KEY` | Play app's base64 RSA licensing **public** key |
| `SPLAT_LIVE_ADS` | `false` for testing (default); `true` for a production release with live banners |

An app ID alone is sufficient for test banners/consent setup. A live banner requires both IDs and `SPLAT_LIVE_ADS=true`; debug builds always use the test banner. Invalid IDs, an incomplete live configuration, or a malformed public key fail the build. Existing `SPLAT_UPLOAD_*` signing secrets remain separate and private. A signed upload alone does not enable products or production ads.

## Purchase behavior and limitations

- Checkout opens only after an explicit press of **Remove Ads**, through the Google Play sheet, at the Play-provided localized price.
- Pending payments do **not** grant ad-free access. Completed purchases must match the app/package and product and pass RSA signature verification.
- Verified purchases remove/destroy the banner immediately and are acknowledged. Unacknowledged purchases are retried on later ownership checks. Play can refund unacknowledged purchases if confirmation cannot finish within its deadline.
- Ownership is cached in native private preferences for offline ad-free play, separately from the game's localStorage. Restarting/exploding never clears it.
- Automatic ownership queries run on connection/resume. **Restore purchases** also queries Google Play, including after reinstall/on another device using the purchasing Play account. No game account is needed. Game statistics do not transfer between devices.
- Failed/offline ownership queries preserve a buyer's cached entitlement. A successful authoritative query with no owned purchase clears it, covering refunds/revocations when the app next checks online. A receipt arriving while an older query is in flight is not revoked by that stale query.
- Cancellation, unavailable Play services/products, and consent/ad failures leave gameplay available.
- This is local signature verification, not server-side receipt verification or instant refund notifications. A modified/rooted client can bypass client-side controls; this is appropriate for the current local-only game, not a claim of fraud-proof billing.

## Release validation

Before launch, test on the internal Play track:

- Consent required/accepted/declined and privacy-options changes. UMP test geography/device settings should be used during QA, never forced for production users.
- Test banner loaded, ad no fill/network loss, both orientations, older phone, audio/background behavior. Confirm the banner does not overlap controls or require scrolling.
- Test checkout success, cancellation, declined payment, pending payment completed/cancelled using Play license-test methods, and returning from the sheet.
- Relaunch/offline mode after purchase, repeated Restore, and reinstall/restore with the same account.
- Refund/revoke the test order and check that a later successful Play query updates entitlement. Confirm a network error never removes a cached valid entitlement.
- Update the store's ads declaration, privacy policy and Data safety answers for **AdMob/UMP/Billing**, including SDK collection/sharing. The game remains local, but the release as a whole is no longer an offline app with no SDK data use.

Automated checks cover receipt signature rejection/tampering, the UI bridge, disabled/unavailable/owned checkout states, native startup, and mobile layout. They do not replace a real licensed Play purchase or region-specific consent testing.
