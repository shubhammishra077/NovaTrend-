export const ROLE = Object.freeze({ BUYER: "buyer", SELLER: "seller", ADMIN: "admin" });
export const USER_ROLES = Object.freeze(Object.values(ROLE));
export const ORDER_STATUS = Object.freeze({
    PENDING: "pending",
    CONFIRMED: "confirmed",
    SHIPPED: "shipped",
    DELIVERED: "delivered",
    CANCELLED: "cancelled",
});
export const ORDER_STATUSES = Object.freeze(Object.values(ORDER_STATUS));
export const PAYMENT_STATUS = Object.freeze({ PENDING: "pending", PAID: "paid", FAILED: "failed" });
export const PAYMENT_STATUSES = Object.freeze(Object.values(PAYMENT_STATUS));
export const PAYMENT_METHOD = Object.freeze({ COD: "cod", RAZORPAY: "razorpay" });
export const PAYMENT_METHODS = Object.freeze(Object.values(PAYMENT_METHOD));
export const DELIVERY_STATUS = Object.freeze({ PICKUP: "pickup", DELIVERY: "delivery" });
export const DELIVERY_STATUSES = Object.freeze(Object.values(DELIVERY_STATUS));
export const PRODUCT_STATUS = Object.freeze({ DRAFT: "draft", ACTIVE: "active", ARCHIVED: "archived", REJECTED: "rejected" });
export const PRODUCT_STATUSES = Object.freeze([
    PRODUCT_STATUS.DRAFT,
    PRODUCT_STATUS.ACTIVE,
    PRODUCT_STATUS.ARCHIVED,
]);
export const ADMIN_PRODUCT_STATUSES = Object.freeze([...PRODUCT_STATUSES, PRODUCT_STATUS.REJECTED]);
export const DATA_DELETION_STATUS = Object.freeze({
    PENDING: "pending",
    APPROVED: "approved",
    REJECTED: "rejected",
    COMPLETED: "completed",
});
export const DATA_DELETION_STATUSES = Object.freeze(Object.values(DATA_DELETION_STATUS));
export const BLOG_STATUS = Object.freeze({ DRAFT: "draft", PUBLISHED: "published" });
export const BLOG_STATUSES = Object.freeze(Object.values(BLOG_STATUS));
export const RAZORPAY_EVENT = Object.freeze({
    CAPTURED: "payment.captured",
    FAILED: "payment.failed",
});
export const RAZORPAY_PAYMENT_STATUS = Object.freeze({ CAPTURED: "captured" });
export const PRODUCT_CATEGORIES = Object.freeze([
    "fashion",
    "electronics",
    "beauty",
    "fitness",
    "home-decor",
    "accessories",
]);
export const PRODUCT_GENDERS = Object.freeze(["men", "women", "unisex"]);
export const PRODUCT_SORTS = Object.freeze(["newest", "price_asc", "price_desc", "rating_desc"]);

export function isOneOf(value, allowedValues) {
    return typeof value === "string" && allowedValues.includes(value);
}

export function isOrderStatus(value) {
    return isOneOf(value, ORDER_STATUSES);
}

export function isPaymentStatus(value) {
    return isOneOf(value, PAYMENT_STATUSES);
}

export function isProductStatus(value) {
    return isOneOf(value, PRODUCT_STATUSES);
}

export function canTransitionDataDeletionStatus(currentStatus, nextStatus) {
    return (currentStatus === DATA_DELETION_STATUS.PENDING &&
        [DATA_DELETION_STATUS.APPROVED, DATA_DELETION_STATUS.REJECTED].includes(nextStatus)) ||
        (currentStatus === DATA_DELETION_STATUS.APPROVED && nextStatus === DATA_DELETION_STATUS.COMPLETED);
}
