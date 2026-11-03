package com.shootyq.clickclickboom;

import org.junit.Test;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.util.Base64;
import static org.junit.Assert.*;

public class PurchaseVerifierTest {
    private static KeyPair key() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        return generator.generateKeyPair();
    }
    private static String publicKey(KeyPair pair) { return Base64.getEncoder().encodeToString(pair.getPublic().getEncoded()); }
    private static String sign(KeyPair pair, String data) throws Exception {
        Signature signer = Signature.getInstance("SHA1withRSA");
        signer.initSign(pair.getPrivate());
        signer.update(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signer.sign());
    }
    @Test public void acceptsSignedReceiptAndRejectsChangedPurchase() throws Exception {
        KeyPair pair = key();
        String data = "{\"productId\":\"remove_ads\",\"purchaseToken\":\"receipt-✓\",\"purchaseState\":0}";
        String signature = sign(pair, data);
        assertTrue(PurchaseVerifier.verify(publicKey(pair), data, signature));
        assertFalse(PurchaseVerifier.verify(publicKey(pair), data.replace("receipt-✓", "forged"), signature));
        assertFalse(PurchaseVerifier.verify(publicKey(key()), data, signature));
    }
    @Test public void rejectsMissingAndMalformedReceiptsWithoutCrashing() {
        assertFalse(PurchaseVerifier.verify(null, "data", "sig"));
        assertFalse(PurchaseVerifier.verify("", "data", "sig"));
        assertFalse(PurchaseVerifier.verify("not-a-key", "data", "not-a-signature"));
        assertFalse(PurchaseVerifier.verify("key", null, "sig"));
        assertFalse(PurchaseVerifier.verify("key", "data", null));
    }
}
