package com.shootyq.clickclickboom;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/** Local Play purchase signature verification. No private key or server is bundled. */
final class PurchaseVerifier {
    private PurchaseVerifier() {}

    static boolean verify(String publicKey, String signedData, String signature) {
        if (publicKey == null || publicKey.isEmpty() || signedData == null || signedData.isEmpty()
                || signature == null || signature.isEmpty()) return false;
        try {
            Signature verifier = Signature.getInstance("SHA1withRSA");
            verifier.initVerify(KeyFactory.getInstance("RSA").generatePublic(
                    new X509EncodedKeySpec(Base64.getDecoder().decode(publicKey))));
            verifier.update(signedData.getBytes(StandardCharsets.UTF_8));
            return verifier.verify(Base64.getDecoder().decode(signature));
        } catch (java.security.GeneralSecurityException | IllegalArgumentException exception) {
            return false;
        }
    }
}
