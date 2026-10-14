import { prisma } from "../lib/prisma.js";
import { inngest } from "../inngest/index.js";
import { getRazorpayClient, verifyPaymentSignature } from "../lib/razorpay.js";
import { calculateOrderTotals, canAccessOrder, canSellerUpdateOrder, discountedPrice, OrderRequestError } from "../lib/order-rules.js";
import { markOrderPaid, releaseOrderInventory, PaymentStateConflictError, InventoryReconciliationError } from "../lib/order-payments.js";
import {
    DELIVERY_STATUS,
    DELIVERY_STATUSES,
    ORDER_STATUS,
    ORDER_STATUSES,
    PAYMENT_METHOD,
    PAYMENT_METHODS,
    PAYMENT_STATUS,
    PAYMENT_STATUSES,
    PRODUCT_STATUS,
} from "../lib/api-constants.js";
import { ApiError, handleControllerError, sendApiError } from "../lib/api-response.js";
import { parsePagination, requireEnum, requireObject, requireObjectId, requireString } from "../lib/request-validation.js";
async function resolvePromo(code, sellerIds = [], db = prisma) {
    if (!code)
        return { percent: 0, code: null, sellerId: null };
    if (typeof code !== "string")
        return { percent: 0, code: null, sellerId: null, invalid: true };
    const upper = code.trim().toUpperCase();
    const promos = await db.promo.findMany({ where: { code: upper, active: true } });
    const now = new Date();
    const valid = promos.filter((p) => !p.expiresAt || new Date(p.expiresAt) > now);
    if (valid.length > 0) {
        const set = new Set(sellerIds);
        const sellerMatch = valid.find((p) => p.sellerId && set.has(p.sellerId));
        if (sellerMatch)
            return { percent: sellerMatch.discountPercent, code: upper, sellerId: sellerMatch.sellerId };
        const globalMatch = valid.find((p) => !p.sellerId);
        if (globalMatch)
            return { percent: globalMatch.discountPercent, code: upper, sellerId: null };
        return { percent: 0, code: null, sellerId: null, invalid: true };
    }
    return { percent: 0, code: null, sellerId: null, invalid: true };
}

export async function createOrder(req, res) {
    try {
        requireObject(req.body);
        const session = req.session;
        const userId = session.user.id;
        const { deliveryStatus, address, phone, promoCode, paymentMethod, items } = req.body ?? {};
        requireEnum(deliveryStatus, "deliveryStatus", DELIVERY_STATUSES);
        requireEnum(paymentMethod, "paymentMethod", PAYMENT_METHODS);
        if (!Array.isArray(items) || items.length === 0) {
            throw new ApiError(400, "Cart is empty.", "VALIDATION_ERROR", { field: "items" });
        }
        if (items.length > 50) {
            throw new ApiError(400, "Cart can contain at most 50 items.", "VALIDATION_ERROR", { field: "items" });
        }
        items.forEach((item, index) => {
            requireObject(item, `items[${index}]`);
            requireObjectId(item.productId, `items[${index}].productId`);
            if (!Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
                throw new ApiError(400, "Each item quantity must be a positive whole number.", "VALIDATION_ERROR", { field: `items[${index}].quantity` });
            }
        });
        if (new Set(items.map((item) => item.productId)).size !== items.length) {
            throw new ApiError(400, "Remove duplicate product lines before checkout.", "VALIDATION_ERROR", { field: "items" });
        }
        if (promoCode !== undefined && typeof promoCode !== "string") {
            throw new ApiError(400, "Invalid promo code.", "VALIDATION_ERROR", { field: "promoCode" });
        }
        requireString(phone, "phone", { min: 7, max: 40 });
        if (deliveryStatus === DELIVERY_STATUS.DELIVERY) {
            requireObject(address, "address");
            requireString(address.street, "address.street", { max: 300 });
            requireString(address.city, "address.city", { max: 120 });
            requireString(address.zip, "address.zip", { max: 20 });
        }
        const productIds = items.map((i) => i.productId);
        const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
        const productMap = new Map(products.map((p) => [p.id, p]));
        const approvedSellers = await prisma.seller.findMany({
            where: { approved: true, revokedAt: null },
            select: { id: true },
        });
        const approvedSellerIds = new Set(approvedSellers.map((seller) => seller.id));
        const sellerIds = [...new Set(items.map((it) => productMap.get(it.productId)?.sellerId).filter(Boolean))];
        for (const it of items) {
            const p = productMap.get(it.productId);
            if (!p)
                throw new ApiError(400, `Product ${it.productId} not found.`, "PRODUCT_UNAVAILABLE");
            if (p.status !== PRODUCT_STATUS.ACTIVE || !approvedSellerIds.has(p.sellerId))
                throw new ApiError(400, `Product ${p.name} not available.`, "PRODUCT_UNAVAILABLE");
            if (p.stock < it.quantity)
                throw new ApiError(409, `Insufficient stock for ${p.name}.`, "INSUFFICIENT_STOCK");
        }
        const promo = await resolvePromo(promoCode, sellerIds);
        if (promo.invalid) {
            throw new ApiError(400, "Invalid promo code.", "INVALID_PROMO");
        }
        const { subtotal, discount, deliveryFee, total } = calculateOrderTotals({
            items,
            productById: productMap,
            deliveryStatus,
            promo,
        });
        const addressSnapshot = deliveryStatus === DELIVERY_STATUS.DELIVERY ? address : null;
        const amount = Math.round(total * 100);
        if (paymentMethod === PAYMENT_METHOD.RAZORPAY && (!Number.isSafeInteger(amount) || amount < 100)) {
            throw new ApiError(400, "Order total must be at least ₹1.00 for online payment.", "MINIMUM_PAYMENT_AMOUNT");
        }
        const order = await prisma.$transaction(async (tx) => {
            for (const item of items) {
                const product = productMap.get(item.productId);
                const seller = await tx.seller.findFirst({
                    where: { id: product.sellerId, approved: true, revokedAt: null },
                    select: { id: true },
                });
                if (!seller) {
                    throw new OrderRequestError(409, `Seller for ${product.name} is no longer approved.`);
                }
                const reserved = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        status: PRODUCT_STATUS.ACTIVE,
                        sellerId: product.sellerId,
                        price: product.price,
                        discount: product.discount,
                        stock: { gte: item.quantity },
                    },
                    data: { stock: { decrement: item.quantity } },
                });
                if (reserved.count !== 1) {
                    throw new OrderRequestError(409, `Stock or price changed for ${product.name}. Refresh your cart and try again.`);
                }
            }
            const created = await tx.order.create({
                data: {
                    userId,
                    status: paymentMethod === PAYMENT_METHOD.COD ? ORDER_STATUS.CONFIRMED : ORDER_STATUS.PENDING,
                    deliveryStatus,
                    paymentMethod,
                    paymentStatus: PAYMENT_STATUS.PENDING,
                    addressSnapshot: addressSnapshot,
                    phoneNumber: phone.trim(),
                    promoCode: promo.code,
                    discount,
                    subtotal,
                    deliveryFee,
                    total,
                    inventoryReservedAt: new Date(),
                },
            });
            for (const it of items) {
                const p = productMap.get(it.productId);
                await tx.orderItem.create({
                    data: {
                        orderId: created.id,
                        productId: p.id,
                        quantity: it.quantity,
                        price: discountedPrice(p.price, p.discount),
                        sellerId: p.sellerId,
                    },
                });
            }
            return created;
        });
        if (paymentMethod === PAYMENT_METHOD.RAZORPAY) {
            try {
                const razorpayOrder = await getRazorpayClient().orders.create({
                    amount,
                    currency: "INR",
                    receipt: order.id,
                    notes: { orderId: order.id, userId },
                });
                const updatedOrder = await prisma.order.update({
                    where: { id: order.id },
                    data: { razorpayOrderId: razorpayOrder.id },
                });
                return res.status(201).json({
                    order: updatedOrder,
                    keyId: process.env.RAZORPAY_KEY_ID,
                    razorpayOrderId: razorpayOrder.id,
                    amount: razorpayOrder.amount,
                    currency: razorpayOrder.currency,
                });
            }
            catch (paymentError) {
                console.error("Failed to create Razorpay order:", paymentError);
                await releaseOrderInventory(order.id);
                throw new ApiError(502, "Could not start Razorpay checkout. Check the server's Razorpay configuration and try again.", "PAYMENT_PROVIDER_ERROR");
            }
        }
        return res.status(201).json({ order });
    }
    catch (e) {
        if (e instanceof ApiError) {
            return sendApiError(res, e);
        }
        if (e instanceof OrderRequestError) {
            return sendApiError(res, new ApiError(e.status, e.message, "ORDER_CONFLICT"));
        }
        return handleControllerError(res, e, "createOrder error");
    }
}

export async function verifyRazorpayPayment(req, res) {
    try {
        requireObject(req.body);
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (![razorpay_order_id, razorpay_payment_id, razorpay_signature].every((value) => typeof value === "string" && value.length > 0)) {
            return res.status(400).json({ error: "Missing Razorpay payment verification details" });
        }
        if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
            return res.status(400).json({ error: "Invalid Razorpay payment signature" });
        }

        const order = await prisma.order.findFirst({
            where: {
                id: requireObjectId(req.params.id, "id"),
                userId: req.session.user.id,
                paymentMethod: PAYMENT_METHOD.RAZORPAY,
                razorpayOrderId: razorpay_order_id,
            },
        });
        if (!order) {
            return res.status(404).json({ error: "Pending Razorpay order not found" });
        }
        if (order.status === ORDER_STATUS.CANCELLED) {
            return res.status(409).json({ error: "This order was cancelled and can no longer be paid." });
        }
        if (order.paymentStatus === PAYMENT_STATUS.PAID) {
            if (order.razorpayPaymentId === razorpay_payment_id) {
                return res.json({ order });
            }
            return res.status(409).json({ error: "This order has already been paid" });
        }
        if (order.paymentStatus !== PAYMENT_STATUS.PENDING) {
            return res.status(409).json({ error: "This order is not awaiting payment" });
        }

        const payment = await getRazorpayClient().payments.fetch(razorpay_payment_id);
        if (payment.order_id !== order.razorpayOrderId ||
            payment.currency !== "INR" ||
            payment.amount !== Math.round(order.total * 100)) {
            return res.status(409).json({ error: "Razorpay payment details do not match this order." });
        }
        if (payment.status === PAYMENT_STATUS.FAILED) {
            await releaseOrderInventory(order.id, payment.id);
            return res.status(409).json({ error: "Payment failed. Your reserved stock was released; you can place a new order." });
        }
        if (payment.status !== "captured") {
            return res.status(409).json({ error: "Payment is not confirmed yet. Keep this order reference and refresh its status shortly." });
        }

        const result = await markOrderPaid(order.id, razorpay_payment_id);
        return res.json({ order: result.order });
    }
    catch (error) {
        if (error instanceof ApiError) {
            return sendApiError(res, error);
        }
        if (error instanceof PaymentStateConflictError) {
            return sendApiError(res, new ApiError(409, error.message, "PAYMENT_STATE_CONFLICT"));
        }
        if (error instanceof InventoryReconciliationError) {
            console.error("Captured Razorpay payment requires inventory reconciliation:", error.message);
            return sendApiError(res, new ApiError(503, "Payment was captured, but inventory needs manual reconciliation. Contact support with your order reference.", "INVENTORY_RECONCILIATION_REQUIRED"));
        }
        console.error("Razorpay payment verification failed:", error);
        return handleControllerError(res, error, "Razorpay payment verification failed:");
    }
}
export async function getOrder(req, res) {
    try {
        const session = req.session;
        const id = requireObjectId(req.params.id, "id");
        const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
        if (!order)
            return res.status(404).json({ error: "Order not found" });
        if (!canAccessOrder(session.user, order)) {
            return res.status(403).json({ error: "Forbidden" });
        }
        return res.json({ order });
    }
    catch (e) {
        return handleControllerError(res, e, "getOrder error:");
    }
}
export async function listMyOrders(req, res) {
    try {
        const session = req.session;
        const orders = await prisma.order.findMany({
            where: { userId: session.user.id },
            include: { items: { include: { product: { select: { id: true, name: true, images: true, price: true } } } } },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ orders });
    }
    catch (e) {
        return handleControllerError(res, e, "listMyOrders error:");
    }
}
export async function listSellerOrders(req, res) {
    try {
        const session = req.session;
        const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
        if (!seller)
            return res.status(404).json({ error: "Seller profile not found" });
        const { page, limit, skip } = parsePagination(req.query, { maxLimit: 50 });
        const search = req.query.search === undefined ? "" : requireString(req.query.search, "search", { min: 0, max: 120 });
        const status = req.query.status === undefined || req.query.status === "" ? "" : requireEnum(req.query.status, "status", ORDER_STATUSES);
        const paymentStatus = req.query.paymentStatus === undefined || req.query.paymentStatus === "" ? "" : requireEnum(req.query.paymentStatus, "paymentStatus", PAYMENT_STATUSES);
        const deliveryStatus = req.query.deliveryStatus === undefined || req.query.deliveryStatus === "" ? "" : requireEnum(req.query.deliveryStatus, "deliveryStatus", DELIVERY_STATUSES);
        const orderItems = await prisma.orderItem.findMany({
            where: { sellerId: seller.id },
            select: { orderId: true },
        });
        const orderIds = [...new Set(orderItems.map((o) => o.orderId))];
        if (orderIds.length === 0) {
            return res.json({ orders: [], total: 0, page, limit, totalPages: 1 });
        }
        const where = {
            id: { in: orderIds },
        };
        if (status) {
            where.status = status;
        }
        if (paymentStatus) {
            where.paymentStatus = paymentStatus;
        }
        if (deliveryStatus) {
            where.deliveryStatus = deliveryStatus;
        }
        if (search) {
            const searchIds = orderIds.filter((id) => id.toLowerCase().includes(search.toLowerCase()));
            const or = [
                { phoneNumber: { contains: search, mode: "insensitive" } },
                { promoCode: { contains: search, mode: "insensitive" } },
            ];
            if (searchIds.length > 0) {
                or.push({ id: { in: searchIds } });
            }
            else {
                // allow exact short id match fallback
                or.push({ id: { equals: search } });
            }
            where.OR = or;
            // Ensure base id filter merged: if OR contains id:in searchIds, we keep overall where.id:in orderIds + OR
            // Prisma AND of id:in orderIds and OR id:in searchIds is redundant but ok; keep as is
            // To avoid conflict, keep where.id as in orderIds and OR handles narrowing; Prisma will AND them
        }
        const [orders, total] = await Promise.all([
            prisma.order.findMany({
                where: where,
                include: {
                    items: { include: { product: { select: { id: true, name: true, images: true, price: true, discount: true } } } },
                    user: { select: { id: true, name: true, email: true, image: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limit,
            }),
            prisma.order.count({ where: where }),
        ]);
        // Filter items to only seller's items for seller view, but keep order total context
        const mapped = orders.map((order) => ({
            ...order,
            items: order.items.filter((it) => it.sellerId === seller.id),
            _allItemsCount: order.items.length,
        }));
        const totalPages = Math.ceil(total / limit) || 1;
        return res.json({ orders: mapped, total, page, limit, totalPages });
    }
    catch (e) {
        return handleControllerError(res, e, "listSellerOrders error");
    }
}
export async function updateOrderStatus(req, res) {
    try {
        const session = req.session;
        const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
        if (!seller)
            return res.status(404).json({ error: "Seller profile not found" });
        const id = requireObjectId(req.params.id, "id");
        requireObject(req.body);
        const { status } = req.body;
        requireEnum(status, "status", ORDER_STATUSES);
        const order = await prisma.order.findUnique({ where: { id }, include: { items: true } });
        if (!order)
            return res.status(404).json({ error: "Order not found" });
        if (!canSellerUpdateOrder(seller.id, order.items)) {
            return res.status(409).json({ error: "Orders containing products from multiple sellers cannot be changed by one seller." });
        }
        if (status === ORDER_STATUS.CANCELLED && order.paymentStatus === PAYMENT_STATUS.PAID) {
            return res.status(409).json({ error: "Paid orders require a refund review before cancellation." });
        }
        if (status === ORDER_STATUS.CANCELLED && order.paymentMethod === PAYMENT_METHOD.RAZORPAY && order.paymentStatus === PAYMENT_STATUS.PENDING) {
            return res.status(409).json({ error: "Wait for Razorpay to confirm the payment outcome before cancelling this order." });
        }
        const updated = await prisma.$transaction(async (tx) => {
            const current = await tx.order.findUnique({
                where: { id },
                include: { items: true },
            });
            if (!current)
                throw new OrderRequestError(404, "Order not found");
            if (!canSellerUpdateOrder(seller.id, current.items)) {
                throw new OrderRequestError(409, "Orders containing products from multiple sellers cannot be changed by one seller.");
            }
            if (status === ORDER_STATUS.CANCELLED && current.paymentStatus === PAYMENT_STATUS.PAID) {
                throw new OrderRequestError(409, "Paid orders require a refund review before cancellation.");
            }
            if (status === ORDER_STATUS.CANCELLED && current.inventoryReservedAt && !current.inventoryReleasedAt) {
                const cancelled = await tx.order.updateMany({
                    where: { id, status: { not: ORDER_STATUS.CANCELLED }, paymentStatus: { not: PAYMENT_STATUS.PAID }, inventoryReleasedAt: null },
                    data: { status, inventoryReleasedAt: new Date() },
                });
                if (cancelled.count !== 1)
                    throw new OrderRequestError(409, "Order status changed; refresh and try again.");
                for (const item of current.items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: { stock: { increment: item.quantity } },
                    });
                }
                return tx.order.findUnique({
                    where: { id },
                    include: { user: { select: { name: true, email: true } } },
                });
            }
            return tx.order.update({
                where: { id },
                data: { status },
                include: { user: { select: { name: true, email: true } } },
            });
        });
        if (updated.user?.email) {
            await inngest.send({
                name: "app/order.status.changed",
                data: {
                    to: updated.user.email,
                    buyerName: updated.user.name || "Customer",
                    orderId: order.id,
                    status,
                },
            }).catch((notificationError) => {
                console.error("Failed to enqueue order status email:", notificationError);
            });
        }
        return res.json({ order: updated });
    }
    catch (e) {
        if (e instanceof ApiError) {
            return sendApiError(res, e);
        }
        if (e instanceof OrderRequestError) {
            return res.status(e.status).json({ error: e.message });
        }
        return handleControllerError(res, e, "updateOrderStatus error:");
    }
}

export async function markCodPaymentReceived(req, res) {
    try {
        const session = req.session;

        const seller = await prisma.seller.findUnique({
            where: { userId: session.user.id },
        });

        if (!seller) {
            return res.status(404).json({
                error: "Seller profile not found",
            });
        }

        const id = requireObjectId(req.params.id, "id");

        const updated = await prisma.$transaction(async (tx) => {
            const order = await tx.order.findUnique({
                where: { id },
                include: { items: true },
            });

            if (!order) {
                throw new OrderRequestError(404, "Order not found");
            }

            if (!canSellerUpdateOrder(seller.id, order.items)) {
                throw new OrderRequestError(
                    409,
                    "You cannot update this order."
                );
            }

            if (order.status === ORDER_STATUS.CANCELLED) {
                throw new OrderRequestError(
                    409,
                    "Cancelled orders cannot be marked paid."
                );
            }

            if (order.paymentMethod !== PAYMENT_METHOD.COD) {
                throw new OrderRequestError(
                    409,
                    "Only COD orders can be marked paid manually."
                );
            }

            if (order.status !== ORDER_STATUS.DELIVERED) {
                throw new OrderRequestError(
                    409,
                    "Mark the order as delivered before recording COD payment."
                );
            }

            if (order.paymentStatus === PAYMENT_STATUS.PAID) {
                throw new OrderRequestError(
                    409,
                    "This order is already marked as paid."
                );
            }

            if (order.paymentStatus !== PAYMENT_STATUS.PENDING) {
                throw new OrderRequestError(
                    409,
                    "This order is not awaiting payment."
                );
            }

            const result = await tx.order.updateMany({
                where: {
                    id,
                    paymentMethod: PAYMENT_METHOD.COD,
                    paymentStatus: PAYMENT_STATUS.PENDING,
                    status: ORDER_STATUS.DELIVERED,
                },
                data: {
                    paymentStatus: PAYMENT_STATUS.PAID,
                },
            });

            if (result.count !== 1) {
                throw new OrderRequestError(
                    409,
                    "Order payment state changed. Refresh and try again."
                );
            }

            return tx.order.findUnique({
                where: { id },
                include: { items: true },
            });
        });

        return res.json({ order: updated });
    } catch (error) {
        if (error instanceof ApiError) {
            return sendApiError(res, error);
        }

        if (error instanceof OrderRequestError) {
            return res.status(error.status).json({
                error: error.message,
            });
        }

        return handleControllerError(
            res,
            error,
            "markCodPaymentReceived error:"
        );
    }
}

