import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { DATA_DELETION_STATUS, ROLE } from "../lib/api-constants.js";
import { handleControllerError } from "../lib/api-response.js";
import { getProfile, updateProfile, getUserReviews, listAddresses, createAddress, updateAddress, deleteAddress, setDefaultAddress, listPhones, createPhone, updatePhone, deletePhone, setDefaultPhone, } from "../controllers/user.js";
const router = Router();
router.get("/profile", requireAuth, getProfile);
router.put("/profile", requireAuth, updateProfile);
router.get("/reviews", requireAuth, getUserReviews);
router.get("/data-deletion-request", requireAuth, async (req, res) => {
    try {
        const request = await prisma.dataDeletionRequest.findFirst({
            where: { userId: req.session.user.id },
            orderBy: { createdAt: "desc" },
        });
        return res.json({ request });
    }
    catch (error) {
        return handleControllerError(res, error, "Failed to load data deletion request:");
    }
});
router.post("/data-deletion-request", requireAuth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.session.user.id },
            select: { role: true },
        });
        if (!user || ![ROLE.BUYER, ROLE.SELLER].includes(user.role)) {
            return res.status(403).json({ error: "Only buyer and seller accounts can request data deletion." });
        }
        const existing = await prisma.dataDeletionRequest.findFirst({
            where: { userId: req.session.user.id, status: DATA_DELETION_STATUS.PENDING },
            select: { id: true, status: true, createdAt: true },
        });
        if (existing) {
            return res.status(409).json({
                error: "You already have a pending data deletion request.",
                request: existing,
            });
        }
        const request = await prisma.dataDeletionRequest.create({
            data: {
                userId: req.session.user.id,
                userRole: user.role,
                status: DATA_DELETION_STATUS.PENDING,
            },
        });
        return res.status(201).json({ request });
    }
    catch (error) {
        return handleControllerError(res, error, "Failed to submit data deletion request:");
    }
});
// Address CRUD
router.get("/addresses", requireAuth, listAddresses);
router.post("/addresses", requireAuth, createAddress);
router.put("/addresses/:id", requireAuth, updateAddress);
router.delete("/addresses/:id", requireAuth, deleteAddress);
router.post("/addresses/:id/default", requireAuth, setDefaultAddress);
// Phone CRUD
router.get("/phones", requireAuth, listPhones);
router.post("/phones", requireAuth, createPhone);
router.put("/phones/:id", requireAuth, updatePhone);
router.delete("/phones/:id", requireAuth, deletePhone);
router.post("/phones/:id/default", requireAuth, setDefaultPhone);
export default router;
