import test from "node:test";
import assert from "node:assert/strict";
import {
    calculateOrderTotals,
    canAccessOrder,
    canSellerUpdateOrder,
    canManageProduct,
    isApprovedSeller,
    isAdmin,
} from "../src/lib/order-rules.js";
import {
    detectCustomerIntent,
    REFUND_POLICY_RESPONSE,
} from "../src/lib/customer-assistant-rules.js";
import { validateEnvironment } from "../src/lib/environment.js";

test("calculates checkout totals from server product data", () => {
    const products = new Map([
        ["dress", { price: 100, discount: 10, sellerId: "seller-1" }],
        ["bag", { price: 50, discount: 0, sellerId: "seller-2" }],
    ]);

    const totals = calculateOrderTotals({
        items: [
            { productId: "dress", quantity: 2 },
            { productId: "bag", quantity: 1 },
        ],
        productById: products,
        deliveryStatus: "delivery",
        promo: { percent: 10, sellerId: "seller-1" },
    });

    assert.deepEqual(totals, {
        subtotal: 230,
        discount: 18,
        deliveryFee: 5,
        total: 217,
    });
});

test("does not apply seller promo discounts to other sellers' items", () => {
    const totals = calculateOrderTotals({
        items: [{ productId: "item", quantity: 2 }],
        productById: new Map([["item", { price: 40, discount: 0, sellerId: "seller-2" }]]),
        deliveryStatus: "pickup",
        promo: { percent: 25, sellerId: "seller-1" },
    });

    assert.deepEqual(totals, {
        subtotal: 80,
        discount: 0,
        deliveryFee: 0,
        total: 80,
    });
});

test("order reads are limited to the buyer or an administrator", () => {
    const order = { userId: "buyer-1" };

    assert.equal(canAccessOrder({ id: "buyer-1", role: "buyer" }, order), true);
    assert.equal(canAccessOrder({ id: "buyer-2", role: "buyer" }, order), false);
    assert.equal(canAccessOrder({ id: "admin-1", role: "admin" }, order), true);
    assert.equal(canAccessOrder(null, order), false);
});

test("seller can change an order only when every item belongs to that seller", () => {
    assert.equal(canSellerUpdateOrder("seller-1", [{ sellerId: "seller-1" }]), true);
    assert.equal(canSellerUpdateOrder("seller-1", [
        { sellerId: "seller-1" },
        { sellerId: "seller-2" },
    ]), false);
    assert.equal(canSellerUpdateOrder("seller-1", []), false);
    assert.equal(canSellerUpdateOrder(null, [{ sellerId: "seller-1" }]), false);
});

test("seller product management requires an approved owner", () => {
    const seller = { id: "seller-1", userId: "user-1", approved: true, revokedAt: null };
    const product = { sellerId: "seller-1" };

    assert.equal(canManageProduct({ id: "user-1", role: "seller" }, seller, product), true);
    assert.equal(canManageProduct({ id: "user-2", role: "seller" }, seller, product), false);
    assert.equal(canManageProduct({ id: "user-1", role: "buyer" }, seller, product), false);
    assert.equal(canManageProduct({ id: "user-1", role: "seller" }, { ...seller, approved: false }, product), false);
    assert.equal(canManageProduct({ id: "user-1", role: "seller" }, seller, { sellerId: "seller-2" }), false);
});

test("seller approval and admin role checks reject pending, revoked, and non-admin users", () => {
    assert.equal(isApprovedSeller({ approved: true, revokedAt: null }), true);
    assert.equal(isApprovedSeller({ approved: false, revokedAt: null }), false);
    assert.equal(isApprovedSeller({ approved: true, revokedAt: new Date() }), false);
    assert.equal(isAdmin({ role: "admin" }), true);
    assert.equal(isAdmin({ role: "seller" }), false);
});

test("detects common order-status and refund questions without treating shopping questions as order lookups", () => {
    assert.equal(detectCustomerIntent("Where's my order?"), "order-status");
    assert.equal(detectCustomerIntent("Can you track my parcel?"), "order-status");
    assert.equal(detectCustomerIntent("What is the status of my purchase?"), "order-status");
    assert.equal(detectCustomerIntent("What is your refund policy?"), "refund");
    assert.equal(detectCustomerIntent("Can I return this?"), "refund");
    assert.equal(detectCustomerIntent("When will this product arrive?"), "general");
    assert.equal(detectCustomerIntent("When will my order arrive?"), "order-status");
    assert.equal(detectCustomerIntent("Recommend a gift"), "general");
});

test("refund response uses only the published request window and proof requirement", () => {
    assert.match(REFUND_POLICY_RESPONSE, /14 days of delivery/);
    assert.match(REFUND_POLICY_RESPONSE, /video proof of unboxing/);
    assert.match(REFUND_POLICY_RESPONSE, /does not guarantee approval/);
});

test("validates required deployment configuration and paired provider credentials", () => {
    const validEnvironment = {
        DATABASE_URL: "mongodb://localhost:27017/marketplace",
        BETTER_AUTH_SECRET: "a".repeat(32),
        BETTER_AUTH_URL: "http://localhost:5000",
        FRONTEND_URL: "http://localhost:5173",
        NODE_ENV: "development",
    };

    assert.doesNotThrow(() => validateEnvironment(validEnvironment));
    assert.throws(
        () => validateEnvironment({ ...validEnvironment, BETTER_AUTH_SECRET: "short" }),
        /at least 32 characters/,
    );
    assert.throws(
        () => validateEnvironment({ ...validEnvironment, GOOGLE_CLIENT_ID: "client-id" }),
        /Set both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET/,
    );
    assert.throws(
        () => validateEnvironment({ ...validEnvironment, RAZORPAY_KEY_ID: "rzp_test_key" }),
        /Set both RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET/,
    );
    assert.throws(
        () => validateEnvironment({
            ...validEnvironment,
            RAZORPAY_KEY_ID: "rzp_test_key",
            RAZORPAY_KEY_SECRET: "test-secret",
        }),
        /Set RAZORPAY_WEBHOOK_SECRET/,
    );
    assert.throws(
        () => validateEnvironment({ ...validEnvironment, NODE_ENV: "production" }),
        /public HTTPS URL in production/,
    );
});
