import { createHmac, timingSafeEqual } from "node:crypto";
import Razorpay from "razorpay";

export function getRazorpayClient() {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keyId || !keySecret) {
        throw new Error("Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.");
    }
    return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function matchesHmac(secret, message, signature) {
    if (typeof signature !== "string" || !/^[\da-f]{64}$/i.test(signature)) {
        return false;
    }
    const expected = createHmac("sha256", secret).update(message).digest();
    const received = Buffer.from(signature, "hex");
    return received.length === expected.length && timingSafeEqual(received, expected);
}

export function verifyPaymentSignature(orderId, paymentId, signature) {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
        throw new Error("RAZORPAY_KEY_SECRET is not configured.");
    }
    return matchesHmac(secret, `${orderId}|${paymentId}`, signature);
}

export function verifyWebhookSignature(rawBody, signature) {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
        throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured.");
    }
    return matchesHmac(secret, rawBody, signature);
}
