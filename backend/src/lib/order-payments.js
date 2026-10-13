import { prisma } from "./prisma.js";
import { ORDER_STATUS, PAYMENT_STATUS } from "./api-constants.js";

export class PaymentStateConflictError extends Error {}
export class InventoryReconciliationError extends Error {}

export async function releaseOrderInventory(orderId, paymentId, db = prisma) {
    return db.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order || order.paymentStatus !== PAYMENT_STATUS.PENDING || order.inventoryReleasedAt) {
            return false;
        }
        const releasedAt = new Date();
        const updated = await tx.order.updateMany({
            where: { id: order.id, paymentStatus: PAYMENT_STATUS.PENDING, inventoryReleasedAt: null },
            data: {
                paymentStatus: PAYMENT_STATUS.FAILED,
                inventoryReleasedAt: releasedAt,
                ...(paymentId ? { razorpayPaymentId: paymentId } : {}),
            },
        });
        if (updated.count !== 1)
            return false;
        if (order.inventoryReservedAt) {
            for (const item of order.items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: { stock: { increment: item.quantity } },
                });
            }
        }
        return true;
    });
}

export async function markOrderPaid(orderId, paymentId, db = prisma) {
    return db.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order)
            throw new PaymentStateConflictError("Order was not found.");
        if (order.status === ORDER_STATUS.CANCELLED)
            throw new PaymentStateConflictError("Cancelled orders cannot be marked paid.");
        if (order.paymentStatus === PAYMENT_STATUS.PAID) {
            if (order.razorpayPaymentId !== paymentId)
                throw new PaymentStateConflictError("Order is already paid with a different payment.");
            return { order, duplicate: true };
        }

        if (order.paymentStatus === PAYMENT_STATUS.FAILED || !order.inventoryReservedAt) {
            for (const item of order.items) {
                const reserved = await tx.product.updateMany({
                    where: { id: item.productId, stock: { gte: item.quantity } },
                    data: { stock: { decrement: item.quantity } },
                });
                if (reserved.count !== 1) {
                    throw new InventoryReconciliationError(
                        `Captured payment ${paymentId} could not reacquire inventory for order ${order.id}.`,
                    );
                }
            }
        }
        else if (order.paymentStatus !== PAYMENT_STATUS.PENDING) {
            throw new PaymentStateConflictError("Order is not awaiting payment.");
        }

        const updated = await tx.order.updateMany({
            where: {
                id: order.id,
                paymentStatus: order.paymentStatus,
                status: { not: ORDER_STATUS.CANCELLED },
                ...(order.paymentStatus === PAYMENT_STATUS.FAILED
                    ? order.inventoryReleasedAt ? { inventoryReleasedAt: { not: null } } : {}
                    : { inventoryReleasedAt: null }),
            },
            data: {
                paymentStatus: PAYMENT_STATUS.PAID,
                status: ORDER_STATUS.CONFIRMED,
                razorpayPaymentId: paymentId,
                inventoryReservedAt: order.inventoryReservedAt ?? new Date(),
                inventoryReleasedAt: null,
            },
        });
        if (updated.count !== 1) {
            throw new PaymentStateConflictError("Order payment state changed during confirmation.");
        }
        return {
            order: await tx.order.findUnique({ where: { id: order.id } }),
            duplicate: false,
        };
    });
}
