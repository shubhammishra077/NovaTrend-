import { Router } from "express";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireSeller } from "../middlewares/require-seller.js";

import {
    createOrder,
    getOrder,
    listMyOrders,
    listSellerOrders,
    updateOrderStatus,
    verifyRazorpayPayment,
    markCodPaymentReceived,
} from "../controllers/order.js";

const router = Router();

router.get("/seller", requireAuth, requireSeller, listSellerOrders);

router.patch("/:id/status", requireAuth, requireSeller, updateOrderStatus);

// Mark a delivered COD order as paid
router.patch(
    "/:id/cod-payment",
    requireAuth,
    requireSeller,
    markCodPaymentReceived
);

router.post("/", requireAuth, createOrder);

router.post("/:id/razorpay/verify", requireAuth, verifyRazorpayPayment);

router.get("/", requireAuth, listMyOrders);

router.get("/:id", requireAuth, getOrder);

export default router;
