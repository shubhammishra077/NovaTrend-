import test from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
    verifyPaymentSignature,
    verifyWebhookSignature,
} from "../src/lib/razorpay.js";

function sign(secret, payload) {
    return createHmac("sha256", secret).update(payload).digest("hex");
}

test("verifies a server-side Razorpay payment signature", () => {
    const previousSecret = process.env.RAZORPAY_KEY_SECRET;
    process.env.RAZORPAY_KEY_SECRET = "test-key-secret";
    try {
        const signature = sign("test-key-secret", "order-1|payment-1");
        assert.equal(verifyPaymentSignature("order-1", "payment-1", signature), true);
        assert.equal(verifyPaymentSignature("order-1", "payment-2", signature), false);
        assert.equal(verifyPaymentSignature("order-1", "payment-1", "invalid"), false);
    }
    finally {
        if (previousSecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
        else process.env.RAZORPAY_KEY_SECRET = previousSecret;
    }
});

test("verifies Razorpay webhooks against the exact raw request bytes", () => {
    const previousSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
    try {
        const rawBody = Buffer.from('{"event":"payment.captured"}');
        const signature = sign("test-webhook-secret", rawBody);
        assert.equal(verifyWebhookSignature(rawBody, signature), true);
        assert.equal(verifyWebhookSignature(Buffer.from('{"event":"payment.failed"}'), signature), false);
    }
    finally {
        if (previousSecret === undefined) delete process.env.RAZORPAY_WEBHOOK_SECRET;
        else process.env.RAZORPAY_WEBHOOK_SECRET = previousSecret;
    }
});
