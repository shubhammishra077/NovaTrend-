import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";

const enabled = process.env.RUN_AUTH_INTEGRATION === "true";
const port = 5500;
const baseUrl = `http://127.0.0.1:${port}`;
let server;
let testPrisma;

before(async () => {
    if (!enabled) return;

    server = spawn(process.execPath, ["src/server.js"], {
        cwd: process.cwd(),
        env: {
            ...process.env,
            PORT: String(port),
            BETTER_AUTH_URL: baseUrl,
            FRONTEND_URL: "http://localhost:5173",
            RAZORPAY_WEBHOOK_SECRET: "ci-webhook-secret",
            INNGEST_DEV: "1",
        },
        stdio: ["ignore", "ignore", "inherit"],
    });

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        if (server.exitCode !== null) {
            throw new Error(`Backend exited before becoming healthy (exit ${server.exitCode}).`);
        }
        try {
            const response = await fetch(`${baseUrl}/health`);
            if (response.ok) return;
        }
        catch {
            await new Promise((resolve) => setTimeout(resolve, 250));
        }
    }
    throw new Error("Backend did not become healthy within 30 seconds.");
});

after(() => {
    if (server && server.exitCode === null) server.kill();
    if (testPrisma) return testPrisma.$disconnect();
});

test("email signup, login, and invalid-password rejection", { skip: !enabled }, async () => {
    const email = `ci-${globalThis.crypto.randomUUID()}@example.test`;
    const password = `Safe-${globalThis.crypto.randomUUID()}-9a`;
    const signUp = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "CI Buyer", email, password }),
    });
    assert.equal(signUp.status, 200);

    const signIn = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password }),
    });
    assert.equal(signIn.status, 200);
    const cookies = signIn.headers.getSetCookie().map((cookie) => cookie.split(";")[0]);
    assert.ok(cookies.length > 0, "successful login should set a session cookie");

    const session = await fetch(`${baseUrl}/api/me`, {
        headers: { cookie: cookies.join("; ") },
    });
    assert.equal(session.status, 200);
    assert.equal((await session.json()).user.email, email);

    const rejectedLogin = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, password: "incorrect-password" }),
    });
    assert.equal(rejectedLogin.status, 401);
});

test("checkout, stock contention, payments, cancellation, seller isolation, and admin authorization are enforced", { skip: !enabled }, async () => {
    const { prisma } = await import("../src/lib/prisma.js");
    testPrisma = prisma;
    const password = `Safe-${globalThis.crypto.randomUUID()}-9a`;
    const accounts = [];
    const orderIds = [];
    const createAccount = async (role, index) => {
        const account = {
            email: `ci-${role}-${index}-${globalThis.crypto.randomUUID()}@example.test`,
            password,
            name: `CI ${role}`,
        };
        const signup = await fetch(`${baseUrl}/api/auth/sign-up/email`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(account),
        });
        assert.equal(signup.status, 200);
        const signupBody = await signup.json();
        accounts.push(signupBody.user.id);
        if (role !== "buyer") {
            await prisma.user.update({
                where: { id: signupBody.user.id },
                data: { role },
            });
        }
        const login = await fetch(`${baseUrl}/api/auth/sign-in/email`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ email: account.email, password }),
        });
        assert.equal(login.status, 200);
        return {
            userId: signupBody.user.id,
            cookie: login.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; "),
        };
    };

    const buyer = await createAccount("buyer", "order-owner");
    const sellerOneUser = await createAccount("seller", "owner");
    const sellerTwoUser = await createAccount("seller", "other");
    const admin = await createAccount("admin", "reviewer");
    const sellerOne = await prisma.seller.create({
        data: { userId: sellerOneUser.userId, name: "CI seller one", approved: true },
    });
    const sellerTwo = await prisma.seller.create({
        data: { userId: sellerTwoUser.userId, name: "CI seller two", approved: true },
    });
    const pendingSellerUser = await createAccount("seller", "pending");
    const pendingSeller = await prisma.seller.create({
        data: { userId: pendingSellerUser.userId, name: "CI pending seller", approved: false },
    });
    const product = await prisma.product.create({
        data: {
            name: "CI product",
            price: 10,
            category: "fashion",
            images: [],
            stock: 5,
            sizes: [],
            colors: [],
            status: "active",
            sellerId: sellerOne.id,
        },
    });
    const otherSellerProduct = await prisma.product.create({
        data: {
            name: "CI other seller product",
            price: 20,
            category: "fashion",
            images: [],
            stock: 3,
            sizes: [],
            colors: [],
            status: "active",
            sellerId: sellerTwo.id,
        },
    });
    const order = await prisma.order.create({
        data: {
            userId: buyer.userId,
            status: "pending",
            deliveryStatus: "pickup",
            paymentMethod: "cod",
            paymentStatus: "pending",
            phoneNumber: "1234567890",
            subtotal: 10,
            total: 10,
        },
    });

    try {
        const unauthenticatedApproval = await fetch(`${baseUrl}/api/admin/sellers/${pendingSeller.id}/approve`, {
            method: "PATCH",
        });
        assert.equal(unauthenticatedApproval.status, 401);
        const buyerApproval = await fetch(`${baseUrl}/api/admin/sellers/${pendingSeller.id}/approve`, {
            method: "PATCH",
            headers: { cookie: buyer.cookie },
        });
        assert.equal(buyerApproval.status, 403);

        const approval = await fetch(`${baseUrl}/api/admin/sellers/${pendingSeller.id}/approve`, {
            method: "PATCH",
            headers: { cookie: admin.cookie },
        });
        assert.equal(approval.status, 200);
        assert.equal((await approval.json()).seller.approved, true);

        const unauthorizedProductUpdate = await fetch(`${baseUrl}/api/products/${product.id}`, {
            method: "PUT",
            headers: { cookie: sellerTwoUser.cookie, "content-type": "application/json" },
            body: JSON.stringify({ name: "Unauthorized change" }),
        });
        assert.equal(unauthorizedProductUpdate.status, 403);

        const authorizedProductUpdate = await fetch(`${baseUrl}/api/products/${product.id}`, {
            method: "PUT",
            headers: { cookie: sellerOneUser.cookie, "content-type": "application/json" },
            body: JSON.stringify({ name: "Owner update" }),
        });
        assert.equal(authorizedProductUpdate.status, 200);

        const buyerOrder = await fetch(`${baseUrl}/api/orders/${order.id}`, {
            headers: { cookie: buyer.cookie },
        });
        assert.equal(buyerOrder.status, 200);

        const crossAccountOrder = await fetch(`${baseUrl}/api/orders/${order.id}`, {
            headers: { cookie: sellerTwoUser.cookie },
        });
        assert.equal(crossAccountOrder.status, 403);

        const adminOrder = await fetch(`${baseUrl}/api/orders/${order.id}`, {
            headers: { cookie: admin.cookie },
        });
        assert.equal(adminOrder.status, 200);

        const checkout = await fetch(`${baseUrl}/api/orders`, {
            method: "POST",
            headers: { cookie: buyer.cookie, "content-type": "application/json" },
            body: JSON.stringify({
                deliveryStatus: "pickup",
                phone: "1234567890",
                paymentMethod: "cod",
                items: [{ productId: product.id, quantity: 1 }],
            }),
        });
        assert.equal(checkout.status, 201);
        const checkoutOrder = (await checkout.json()).order;
        orderIds.push(checkoutOrder.id);
        assert.equal(checkoutOrder.status, "confirmed");
        assert.equal(checkoutOrder.paymentStatus, "pending");
        assert.equal(checkoutOrder.subtotal, 10);
        assert.equal(checkoutOrder.discount, 0);
        assert.equal(checkoutOrder.deliveryFee, 0);
        assert.equal(checkoutOrder.total, 10);
        assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 4);
        const otherSellerCancel = await fetch(`${baseUrl}/api/orders/${checkoutOrder.id}/status`, {
            method: "PATCH",
            headers: { cookie: sellerTwoUser.cookie, "content-type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
        });
        assert.equal(otherSellerCancel.status, 409);
        assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 4);
        const cancelCodOrder = async () => fetch(`${baseUrl}/api/orders/${checkoutOrder.id}/status`, {
            method: "PATCH",
            headers: { cookie: sellerOneUser.cookie, "content-type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
        });
        assert.equal((await cancelCodOrder()).status, 200);
        assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 5);
        assert.equal((await cancelCodOrder()).status, 200);
        assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 5);

        const invalidMockPromo = await fetch(`${baseUrl}/api/orders`, {
            method: "POST",
            headers: { cookie: buyer.cookie, "content-type": "application/json" },
            body: JSON.stringify({
                deliveryStatus: "pickup",
                phone: "1234567890",
                paymentMethod: "cod",
                promoCode: "SAVE10",
                items: [{ productId: product.id, quantity: 1 }],
            }),
        });
        assert.equal(invalidMockPromo.status, 400);
        assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 5);

        await prisma.product.update({
            where: { id: otherSellerProduct.id },
            data: { stock: 1 },
        });
        const concurrentCheckout = () => fetch(`${baseUrl}/api/orders`, {
            method: "POST",
            headers: { cookie: buyer.cookie, "content-type": "application/json" },
            body: JSON.stringify({
                deliveryStatus: "pickup",
                phone: "1234567890",
                paymentMethod: "cod",
                items: [{ productId: otherSellerProduct.id, quantity: 1 }],
            }),
        });
        const concurrentResults = await Promise.all([concurrentCheckout(), concurrentCheckout()]);
        assert.deepEqual(concurrentResults.map((response) => response.status).sort(), [201, 409]);
        const successfulConcurrentCheckout = concurrentResults.find((response) => response.status === 201);
        const contentionOrder = (await successfulConcurrentCheckout.json()).order;
        orderIds.push(contentionOrder.id);
        assert.equal((await prisma.product.findUnique({ where: { id: otherSellerProduct.id } })).stock, 0);
        const cancelContentionOrder = await fetch(`${baseUrl}/api/orders/${contentionOrder.id}/status`, {
            method: "PATCH",
            headers: { cookie: sellerTwoUser.cookie, "content-type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
        });
        assert.equal(cancelContentionOrder.status, 200);
        assert.equal((await prisma.product.findUnique({ where: { id: otherSellerProduct.id } })).stock, 1);

        await prisma.product.update({
            where: { id: product.id },
            data: { stock: { decrement: 1 } },
        });
        await prisma.product.update({
            where: { id: otherSellerProduct.id },
            data: { stock: { decrement: 1 } },
        });
        const mixedSellerOrder = await prisma.order.create({
            data: {
                userId: buyer.userId,
                status: "pending",
                deliveryStatus: "pickup",
                paymentMethod: "cod",
                paymentStatus: "pending",
                phoneNumber: "1234567890",
                subtotal: 30,
                total: 30,
                inventoryReservedAt: new Date(),
            },
        });
        orderIds.push(mixedSellerOrder.id);
        await prisma.orderItem.createMany({
            data: [
                { orderId: mixedSellerOrder.id, productId: product.id, quantity: 1, price: 10, sellerId: sellerOne.id },
                { orderId: mixedSellerOrder.id, productId: otherSellerProduct.id, quantity: 1, price: 20, sellerId: sellerTwo.id },
            ],
        });
        const sellerCancelMixedOrder = await fetch(`${baseUrl}/api/orders/${mixedSellerOrder.id}/status`, {
            method: "PATCH",
            headers: { cookie: sellerOneUser.cookie, "content-type": "application/json" },
            body: JSON.stringify({ status: "cancelled" }),
        });
        assert.equal(sellerCancelMixedOrder.status, 409);
        assert.equal((await prisma.order.findUnique({ where: { id: mixedSellerOrder.id } })).status, "pending");
        assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 4);
        assert.equal((await prisma.product.findUnique({ where: { id: otherSellerProduct.id } })).stock, 0);

        const createReservedRazorpayOrder = async (orderId) => {
            await prisma.product.update({
                where: { id: product.id },
                data: { stock: { decrement: 1 } },
            });
            const paymentOrder = await prisma.order.create({
                data: {
                    userId: buyer.userId,
                    status: "pending",
                    deliveryStatus: "pickup",
                    paymentMethod: "razorpay",
                    paymentStatus: "pending",
                    phoneNumber: "1234567890",
                    subtotal: 10,
                    total: 10,
                    razorpayOrderId: orderId,
                    inventoryReservedAt: new Date(),
                },
            });
            orderIds.push(paymentOrder.id);
            await prisma.orderItem.create({
                data: {
                    orderId: paymentOrder.id,
                    productId: product.id,
                    quantity: 1,
                    price: 10,
                    sellerId: sellerOne.id,
                },
            });
            return paymentOrder;
        };
        const sendWebhook = async (event, payment) => {
            const body = JSON.stringify({ event, payload: { payment: { entity: payment } } });
            const signature = createHmac("sha256", "ci-webhook-secret").update(body).digest("hex");
            return fetch(`${baseUrl}/api/webhooks/razorpay`, {
                method: "POST",
                headers: {
                    "content-type": "application/json",
                    "x-razorpay-signature": signature,
                },
                body,
            });
        };

        const paidOrder = await createReservedRazorpayOrder("order-ci-captured");
        const capturedPayment = {
            id: "pay-ci-captured",
            order_id: paidOrder.razorpayOrderId,
            status: "captured",
            amount: 1000,
            currency: "INR",
        };
        assert.equal((await sendWebhook("payment.captured", { ...capturedPayment, amount: 999 })).status, 400);
        assert.equal((await prisma.order.findUnique({ where: { id: paidOrder.id } })).paymentStatus, "pending");
        assert.equal((await sendWebhook("payment.captured", capturedPayment)).status, 200);
        assert.equal((await sendWebhook("payment.captured", capturedPayment)).status, 200);
        assert.equal((await sendWebhook("payment.failed", { ...capturedPayment, id: "pay-ci-late-failure", status: "failed" })).status, 200);
        assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 3);
        const paidState = await prisma.order.findUnique({ where: { id: paidOrder.id } });
        assert.equal(paidState.paymentStatus, "paid");
        assert.equal(paidState.razorpayPaymentId, capturedPayment.id);

        const failedOrder = await createReservedRazorpayOrder("order-ci-failed");
        const failedPayment = {
            id: "pay-ci-failed",
            order_id: failedOrder.razorpayOrderId,
            status: "failed",
            amount: 1000,
            currency: "INR",
        };
        assert.equal((await sendWebhook("payment.failed", failedPayment)).status, 200);
        assert.equal((await sendWebhook("payment.failed", failedPayment)).status, 200);
        const failedState = await prisma.order.findUnique({ where: { id: failedOrder.id } });
        assert.equal(failedState.paymentStatus, "failed");
        assert.ok(failedState.inventoryReleasedAt);
        assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 3);

        const recoveredOrder = await createReservedRazorpayOrder("order-ci-recovered");
        assert.equal((await sendWebhook("payment.failed", {
            id: "pay-ci-recovered",
            order_id: recoveredOrder.razorpayOrderId,
            status: "failed",
            amount: 1000,
            currency: "INR",
        })).status, 200);
        assert.equal((await sendWebhook("payment.captured", {
            id: "pay-ci-recovered",
            order_id: recoveredOrder.razorpayOrderId,
            status: "captured",
            amount: 1000,
            currency: "INR",
        })).status, 200);
        const recoveredState = await prisma.order.findUnique({ where: { id: recoveredOrder.id } });
        assert.equal(recoveredState.paymentStatus, "paid");
        assert.equal(recoveredState.inventoryReleasedAt, null);
        assert.equal((await prisma.product.findUnique({ where: { id: product.id } })).stock, 2);

        const soldOut = await prisma.product.updateMany({
            where: { id: product.id },
            data: { stock: 0 },
        });
        assert.equal(soldOut.count, 1);
        const rejectedCheckout = await fetch(`${baseUrl}/api/orders`, {
            method: "POST",
            headers: { cookie: buyer.cookie, "content-type": "application/json" },
            body: JSON.stringify({
                deliveryStatus: "pickup",
                phone: "1234567890",
                paymentMethod: "cod",
                items: [{ productId: product.id, quantity: 1 }],
            }),
        });
        assert.equal(rejectedCheckout.status, 409);
    }
    finally {
        await prisma.order.deleteMany({ where: { id: { in: [order.id, ...orderIds] } } });
        await prisma.product.deleteMany({ where: { id: { in: [product.id, otherSellerProduct.id] } } });
        await prisma.seller.deleteMany({
            where: { id: { in: [sellerOne.id, sellerTwo.id, pendingSeller.id] } },
        });
        await prisma.user.deleteMany({ where: { id: { in: accounts } } });
    }
});
