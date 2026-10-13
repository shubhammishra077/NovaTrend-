import { DELIVERY_STATUS, ROLE } from "./api-constants.js";

export function discountedPrice(price, discount = 0) {
    return discount > 0 ? price * (1 - discount / 100) : price;
}

export function calculateOrderTotals({ items, productById, deliveryStatus, promo }) {
    let subtotal = 0;
    let sellerSubtotal = 0;

    for (const item of items) {
        const product = productById.get(item.productId);
        const lineTotal = discountedPrice(product.price, product.discount) * item.quantity;
        subtotal += lineTotal;
        if (promo.sellerId && product.sellerId === promo.sellerId) {
            sellerSubtotal += lineTotal;
        }
    }

    const discount = promo.percent
        ? (promo.sellerId ? sellerSubtotal : subtotal) * (promo.percent / 100)
        : 0;
    const deliveryFee = deliveryStatus === DELIVERY_STATUS.DELIVERY ? 5 : 0;
    const total = Math.max(0, subtotal + deliveryFee - discount);

    return { subtotal, discount, deliveryFee, total };
}

export class OrderRequestError extends Error {
    constructor(status, message) {
        super(message);
        this.status = status;
    }
}

export function canAccessOrder(user, order) {
    return Boolean(user && order && (user.id === order.userId || user.role === ROLE.ADMIN));
}

export function canSellerUpdateOrder(sellerId, items) {
    return Boolean(
        sellerId &&
        Array.isArray(items) &&
        items.length > 0 &&
        items.every((item) => item.sellerId === sellerId),
    );
}

export function isAdmin(user) {
    return user?.role === ROLE.ADMIN;
}

export function isApprovedSeller(seller) {
    return Boolean(seller?.approved && !seller.revokedAt);
}

export function canManageProduct(user, seller, product) {
    return Boolean(
        user?.role === ROLE.SELLER &&
        seller?.userId === user.id &&
        isApprovedSeller(seller) &&
        product?.sellerId === seller.id,
    );
}
