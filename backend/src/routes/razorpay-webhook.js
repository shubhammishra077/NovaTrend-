import { prisma } from "../lib/prisma.js";
import { verifyWebhookSignature } from "../lib/razorpay.js";
import {
    PAYMENT_METHOD,
    PAYMENT_STATUS,
    RAZORPAY_EVENT,
    RAZORPAY_PAYMENT_STATUS,
} from "../lib/api-constants.js";
import {
    markOrderPaid,
    releaseOrderInventory,
    PaymentStateConflictError,
    InventoryReconciliationError,
} from "../lib/order-payments.js";

export async function handleRazorpayWebhook(req, res) {
    const signature = req.get("x-razorpay-signature");
    if (!Buffer.isBuffer(req.body) || !signature) {
        return res.status(400).json({ error: "Invalid Razorpay webhook request" });
    }

    try {
        if (!verifyWebhookSignature(req.body, signature)) {
            return res.status(400).json({ error: "Invalid Razorpay webhook signature" });
        }
    }
    catch (error) {
        console.error("Razorpay webhook configuration error:", error);
        return res.status(503).json({ error: "Razorpay webhook is not configured" });
    }

    let event;
    try {
        event = JSON.parse(req.body.toString("utf8"));
    }
    catch (error) {
        console.error("Invalid Razorpay webhook payload:", error);
        return res.status(400).json({ error: "Invalid webhook payload" });
    }

    const payment = event?.payload?.payment?.entity;
    if (!payment?.order_id || !payment.id || !Object.values(RAZORPAY_EVENT).includes(event.event)) {
        return res.status(200).json({ received: true });
    }

    try {
        const order = await prisma.order.findFirst({
            where: { razorpayOrderId: payment.order_id, paymentMethod: PAYMENT_METHOD.RAZORPAY },
        });
        if (!order) {
            console.warn("Razorpay webhook references an unknown order:", payment.order_id);
            return res.status(200).json({ received: true });
        }

        const expectedAmount = Math.round(order.total * 100);
        if (payment.currency !== "INR" || payment.amount !== expectedAmount) {
            console.error("Razorpay payment amount or currency does not match order:", order.id);
            return res.status(400).json({ error: "Payment does not match order" });
        }
        if (event.event === RAZORPAY_EVENT.CAPTURED) {
            if (payment.status !== RAZORPAY_PAYMENT_STATUS.CAPTURED) {
                console.error("Razorpay captured event has an unexpected payment status:", order.id);
                return res.status(400).json({ error: "Payment does not match order" });
            }
            const result = await markOrderPaid(order.id, payment.id);
            if (result.duplicate) {
                return res.status(200).json({ received: true, duplicate: true });
            }
        }
        else if (event.event === RAZORPAY_EVENT.FAILED && payment.status === PAYMENT_STATUS.FAILED && order.paymentStatus === PAYMENT_STATUS.PENDING) {
            await releaseOrderInventory(order.id, payment.id);
        }
        return res.status(200).json({ received: true });
    }
    catch (error) {
        if (error instanceof PaymentStateConflictError) {
            console.error("Razorpay payment state conflict:", error.message);
            return res.status(409).json({ error: error.message });
        }
        if (error instanceof InventoryReconciliationError) {
            console.error("Captured Razorpay payment requires inventory reconciliation:", error.message);
            return res.status(503).json({ error: "Captured payment inventory reconciliation failed." });
        }
        console.error("Razorpay webhook processing failed:", error);
        return res.status(500).json({ error: "Failed to process Razorpay webhook" });
    }
}
