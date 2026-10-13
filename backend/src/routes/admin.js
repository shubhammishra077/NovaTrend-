import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middlewares/require-auth.js";
import { requireAdmin } from "../middlewares/require-admin.js";
import { inngest } from "../inngest/index.js";
import {
    ADMIN_PRODUCT_STATUSES,
    DATA_DELETION_STATUS,
    DATA_DELETION_STATUSES,
    ORDER_STATUS,
    PRODUCT_CATEGORIES,
    PRODUCT_GENDERS,
    PRODUCT_STATUS,
    USER_ROLES,
    canTransitionDataDeletionStatus,
} from "../lib/api-constants.js";
import { handleControllerError } from "../lib/api-response.js";
import { parseBoolean, parsePagination, requireEnum, requireIdentifier, requireObject, requireObjectId, requireString } from "../lib/request-validation.js";
const router = Router();
router.get("/data-deletion-requests", requireAuth, requireAdmin, async (req, res) => {
    try {
        const requests = await prisma.dataDeletionRequest.findMany({
            orderBy: { createdAt: "desc" },
            take: 100,
        });
        const userIds = [...new Set(requests.map((request) => request.userId))];
        const [users, sellers] = await Promise.all([
            prisma.user.findMany({
                where: { id: { in: userIds } },
                select: { id: true, name: true, email: true },
            }),
            prisma.seller.findMany({
                where: { userId: { in: userIds } },
                select: { userId: true, name: true, username: true },
            }),
        ]);
        const userById = new Map(users.map((user) => [user.id, user]));
        const sellerByUserId = new Map(sellers.map((seller) => [seller.userId, seller]));
        return res.json({
            requests: requests.map((request) => ({
                ...request,
                user: userById.get(request.userId) ?? null,
                seller: sellerByUserId.get(request.userId) ?? null,
            })),
        });
    }
    catch (error) {
        return handleControllerError(res, error, "Failed to load data deletion requests:");
    }
});
router.patch("/data-deletion-requests/:id", requireAuth, requireAdmin, async (req, res) => {
    try {
        requireObjectId(req.params.id, "id");
        requireObject(req.body);
        const { status, decisionNote } = req.body;
        requireEnum(status, "status", DATA_DELETION_STATUSES.filter((value) => value !== DATA_DELETION_STATUS.PENDING));
        const normalizedDecisionNote = decisionNote === undefined
            ? undefined
            : requireString(decisionNote, "decisionNote", { min: 0, max: 500 });
        const request = await prisma.dataDeletionRequest.findUnique({ where: { id: req.params.id } });
        if (!request) {
            return res.status(404).json({ error: "Data deletion request not found." });
        }
        if (!canTransitionDataDeletionStatus(request.status, status)) {
            return res.status(409).json({ error: `Cannot change a ${request.status} request to ${status}.` });
        }
        const updated = await prisma.dataDeletionRequest.update({
            where: { id: request.id },
            data: {
                status,
                reviewedAt: new Date(),
                reviewedBy: req.session.user.id,
                decisionNote: normalizedDecisionNote?.trim() || null,
            },
        });
        return res.json({ request: updated });
    }
    catch (error) {
        return handleControllerError(res, error, "Failed to update data deletion request:");
    }
});
router.get("/sellers", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { maxLimit: 50 });
        const searchStr = req.query.search === undefined ? "" : requireString(req.query.search, "search", { min: 0, max: 120 });
        const approved = parseBoolean(req.query.approved, "approved", { defaultValue: undefined });
        const where = {};
        if (searchStr) {
            where.OR = [
                { name: { contains: searchStr, mode: "insensitive" } },
                { user: { email: { contains: searchStr, mode: "insensitive" } } },
                { username: { contains: searchStr, mode: "insensitive" } },
            ];
        }
        if (approved !== undefined) {
            where.approved = approved;
        }
        const [sellerRecords, total] = await Promise.all([
            prisma.seller.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true,
                            createdAt: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limitNum,
            }),
            prisma.seller.count({ where }),
        ]);
        const sellers = await Promise.all(sellerRecords.map(async (seller) => ({
            ...seller,
            _count: {
                products: await prisma.product.count({
                    where: { sellerId: seller.id },
                }),
            },
        })));
        return res.json({
            sellers,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        return handleControllerError(res, error, "List sellers error:");
    }
});
router.patch("/sellers/:id/approve", requireAuth, requireAdmin, async (req, res) => {
    try {
        requireObjectId(req.params.id, "id");
        const id = String(req.params.id);
        const seller = await prisma.seller.findUnique({
            where: { id },
            include: { user: { select: { name: true, email: true } } },
        });
        if (!seller)
            return res.status(404).json({ error: "Seller not found" });
        const updated = await prisma.seller.update({
            where: { id },
            data: { approved: true, revokedAt: null, revokedReason: null },
        });
        if (seller.user.email) {
            try {
                await inngest.send({
                    name: "app/seller.approved",
                    data: {
                        to: seller.user.email,
                        sellerName: seller.user.name || seller.name,
                    },
                });
            }
            catch (notificationError) {
                console.error("Failed to enqueue seller approval email:", notificationError);
            }
        }
        return res.json({ seller: updated });
    }
    catch (error) {
        return handleControllerError(res, error, "Approve seller error:");
    }
});
router.patch("/sellers/:id/reject", requireAuth, requireAdmin, async (req, res) => {
    try {
        requireObjectId(req.params.id, "id");
        requireObject(req.body);
        const id = String(req.params.id);
        const reason = requireString(req.body.reason, "reason", { max: 500 });
        const seller = await prisma.seller.findUnique({
            where: { id },
            include: { user: { select: { name: true, email: true } } },
        });
        if (!seller)
            return res.status(404).json({ error: "Seller not found" });
        const [updated] = await prisma.$transaction([
            prisma.seller.update({
                where: { id },
                data: {
                    approved: false,
                    revokedAt: new Date(),
                    revokedReason: reason.trim(),
                },
            }),
            prisma.product.updateMany({
                where: { sellerId: id, status: { not: PRODUCT_STATUS.ARCHIVED } },
                data: { status: PRODUCT_STATUS.ARCHIVED },
            }),
        ]);
        if (seller.user.email) {
            await inngest.send({
                name: "app/seller.rejected",
                data: {
                    to: seller.user.email,
                    sellerName: seller.user.name || seller.name,
                    reason: reason.trim(),
                },
            });
        }
        return res.json({ seller: updated });
    }
    catch (error) {
        return handleControllerError(res, error, "Reject seller error:");
    }
});
router.patch("/sellers/:id/ban", requireAuth, requireAdmin, async (req, res) => {
    try {
        requireObjectId(req.params.id, "id");
        requireObject(req.body);
        const id = String(req.params.id);
        const banned = parseBoolean(req.body.banned, "banned");
        const seller = await prisma.seller.findUnique({ where: { id } });
        if (!seller)
            return res.status(404).json({ error: "Seller not found" });
        await prisma.user.update({
            where: { id: seller.userId },
            data: { banned },
        });
        return res.json({ success: true });
    }
    catch (error) {
        return handleControllerError(res, error, "Ban seller error:");
    }
});
// ─── Users ──────────────────────────────────────────────────────────────────
router.get("/users", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { maxLimit: 50 });
        const searchStr = req.query.search === undefined ? "" : requireString(req.query.search, "search", { min: 0, max: 120 });
        const roleStr = req.query.role === undefined || req.query.role === "" ? "" : requireEnum(req.query.role, "role", USER_ROLES);
        const where = {};
        if (searchStr) {
            where.OR = [
                { name: { contains: searchStr, mode: "insensitive" } },
                { email: { contains: searchStr, mode: "insensitive" } },
            ];
        }
        if (roleStr) {
            where.role = roleStr;
        }
        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                select: {
                    id: true,
                    name: true,
                    email: true,
                    image: true,
                    role: true,
                    banned: true,
                    createdAt: true,
                    seller: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            approved: true,
                        },
                    },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limitNum,
            }),
            prisma.user.count({ where }),
        ]);
        return res.json({
            users,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        return handleControllerError(res, error, "List users error:");
    }
});
router.patch("/users/:id/ban", requireAuth, requireAdmin, async (req, res) => {
    try {
        requireIdentifier(req.params.id, "id");
        requireObject(req.body);
        const id = String(req.params.id);
        const banned = parseBoolean(req.body.banned, "banned");
        const session = req.session;
        if (id === session.user.id) {
            return res.status(400).json({ error: "You cannot ban your own account" });
        }
        const user = await prisma.user.findUnique({
            where: { id },
            include: { seller: { select: { id: true } } },
        });
        if (!user)
            return res.status(404).json({ error: "User not found" });
        await prisma.user.update({
            where: { id },
            data: { banned },
        });
        if (banned && user.email) {
            await inngest.send({
                name: "app/user.banned",
                data: {
                    to: user.email,
                    userName: user.name || "User",
                },
            });
        }
        if (user.seller) {
            if (banned) {
                await prisma.product.updateMany({
                    where: { sellerId: user.seller.id, status: { not: PRODUCT_STATUS.ARCHIVED } },
                    data: { status: PRODUCT_STATUS.ARCHIVED },
                });
            }
            else {
                await prisma.product.updateMany({
                    where: { sellerId: user.seller.id, status: PRODUCT_STATUS.ARCHIVED },
                    data: { status: PRODUCT_STATUS.ACTIVE },
                });
            }
        }
        return res.json({ success: true });
    }
    catch (error) {
        return handleControllerError(res, error, "Ban user error:");
    }
});
// ─── Products ───────────────────────────────────────────────────────────────
router.get("/products", requireAuth, requireAdmin, async (req, res) => {
    try {
        const { page: pageNum, limit: limitNum, skip } = parsePagination(req.query, { maxLimit: 50 });
        const searchStr = req.query.search === undefined ? "" : requireString(req.query.search, "search", { min: 0, max: 120 });
        const categoryStr = req.query.category === undefined || req.query.category === "" ? "" : requireEnum(req.query.category, "category", PRODUCT_CATEGORIES);
        const genderStr = req.query.gender === undefined || req.query.gender === "" ? "" : requireEnum(req.query.gender, "gender", PRODUCT_GENDERS);
        const statusStr = req.query.status === undefined || req.query.status === "" ? "" : requireEnum(req.query.status, "status", ADMIN_PRODUCT_STATUSES);
        const where = {};
        if (searchStr) {
            where.OR = [
                { name: { contains: searchStr, mode: "insensitive" } },
                { description: { contains: searchStr, mode: "insensitive" } },
            ];
        }
        if (categoryStr) {
            where.category = categoryStr;
        }
        if (genderStr) {
            where.gender = genderStr;
        }
        if (statusStr) {
            where.status = statusStr;
        }
        const [products, total] = await Promise.all([
            prisma.product.findMany({
                where,
                include: {
                    seller: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            approved: true,
                        },
                    },
                    _count: { select: { reviews: true } },
                },
                orderBy: { createdAt: "desc" },
                skip,
                take: limitNum,
            }),
            prisma.product.count({ where }),
        ]);
        const productIds = products.map((p) => p.id);
        let ratingMap = new Map();
        if (productIds.length) {
            const reviews = await prisma.review.findMany({
                where: { productId: { in: productIds } },
                select: { productId: true, rating: true },
            });
            const rMap = new Map();
            for (const r of reviews) {
                const arr = rMap.get(r.productId) ?? [];
                arr.push(r.rating);
                rMap.set(r.productId, arr);
            }
            for (const [pid, ratings] of rMap) {
                const totalR = ratings.length;
                const avg = totalR ? ratings.reduce((s, v) => s + v, 0) / totalR : 0;
                ratingMap.set(pid, { avg: Number(avg.toFixed(1)), total: totalR });
            }
        }
        const enriched = products.map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            price: p.price,
            discount: p.discount,
            category: p.category,
            images: p.images,
            stock: p.stock,
            sizes: p.sizes,
            colors: p.colors,
            gender: p.gender,
            status: p.status,
            rejectionReason: p.rejectionReason,
            sellerId: p.sellerId,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
            seller: p.seller,
            avgRating: ratingMap.get(p.id)?.avg ?? 0,
            totalReviews: ratingMap.get(p.id)?.total ?? 0,
        }));
        return res.json({
            products: enriched,
            total,
            page: pageNum,
            limit: limitNum,
            totalPages: Math.ceil(total / limitNum),
        });
    }
    catch (error) {
        return handleControllerError(res, error, "List admin products error:");
    }
});
router.patch("/products/:id/status", requireAuth, requireAdmin, async (req, res) => {
    try {
        requireObjectId(req.params.id, "id");
        requireObject(req.body);
        const id = String(req.params.id);
        const { status, reason } = req.body;
        requireEnum(status, "status", ADMIN_PRODUCT_STATUSES);
        if (status === PRODUCT_STATUS.REJECTED) {
            requireString(reason, "reason", { max: 500 });
        }
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product)
            return res.status(404).json({ error: "Product not found" });
        const updateData = { status };
        if (status === PRODUCT_STATUS.REJECTED) {
            updateData.rejectionReason = reason.trim();
        }
        else {
            updateData.rejectionReason = null;
        }
        const updated = await prisma.product.update({
            where: { id },
            data: updateData,
            include: {
                seller: {
                    select: { id: true, name: true, username: true, approved: true },
                },
            },
        });
        if (status === PRODUCT_STATUS.REJECTED && updated.seller) {
            const sellerUser = await prisma.user.findUnique({
                where: { id: updated.sellerId },
                select: { email: true },
            });
            if (sellerUser?.email) {
                await inngest.send({
                    name: "app/product.rejected",
                    data: {
                        to: sellerUser.email,
                        productName: product.name,
                        reason: reason.trim(),
                    },
                });
            }
        }
        if (status === PRODUCT_STATUS.ACTIVE && product.status === PRODUCT_STATUS.REJECTED && updated.seller) {
            const sellerUser = await prisma.user.findUnique({
                where: { id: updated.sellerId },
                select: { email: true },
            });
            if (sellerUser?.email) {
                await inngest.send({
                    name: "app/product.approved",
                    data: {
                        to: sellerUser.email,
                        productName: product.name,
                    },
                });
            }
        }
        return res.json({ product: updated });
    }
    catch (error) {
        return handleControllerError(res, error, "Update product status error:");
    }
});
// ─── Stats ──────────────────────────────────────────────────────────────────
router.get("/stats", requireAuth, requireAdmin, async (_req, res) => {
    try {
        const [totalUsers, totalSellers, pendingSellers, totalProducts, totalOrders, revenueResult,] = await Promise.all([
            prisma.user.count(),
            prisma.seller.count(),
            prisma.seller.count({ where: { approved: false, revokedAt: null } }),
            prisma.product.count(),
            prisma.order.count({ where: { status: { not: ORDER_STATUS.CANCELLED } } }),
            prisma.order.aggregate({
                where: {
                    status: { not: ORDER_STATUS.CANCELLED },
                    paymentMethod: { not: "stripe" },
                },
                _sum: { total: true },
            }),
        ]);
        const totalRevenue = Math.round((revenueResult._sum.total ?? 0) * 100) / 100;
        // Sales over time — last 30 days
        const todayUTC = new Date();
        todayUTC.setUTCHours(0, 0, 0, 0);
        const startUTC = new Date(todayUTC);
        startUTC.setUTCDate(todayUTC.getUTCDate() - 29);
        const orders = await prisma.order.findMany({
            where: {
                status: { not: ORDER_STATUS.CANCELLED },
                createdAt: { gte: startUTC },
            },
            select: { id: true, total: true, createdAt: true, paymentMethod: true },
        });
        const dayMap = new Map();
        for (let i = 0; i < 30; i++) {
            const d = new Date(startUTC);
            d.setUTCDate(startUTC.getUTCDate() + i);
            const key = d.toISOString().slice(0, 10);
            dayMap.set(key, { revenue: 0, orders: new Set() });
        }
        for (const o of orders) {
            const key = new Date(o.createdAt).toISOString().slice(0, 10);
            const entry = dayMap.get(key);
            if (!entry)
                continue;
            if (o.paymentMethod !== "stripe") {
                entry.revenue += o.total;
            }
            entry.orders.add(o.id);
        }
        const salesOverTime = Array.from(dayMap.entries()).map(([date, v]) => ({
            date,
            revenue: Math.round(v.revenue * 100) / 100,
            orders: v.orders.size,
        }));
        // Recent pending sellers
        const recentPendingSellers = await prisma.seller.findMany({
            where: { approved: false, revokedAt: null },
            select: {
                id: true,
                name: true,
                username: true,
                createdAt: true,
                user: { select: { name: true, email: true } },
            },
            orderBy: { createdAt: "desc" },
            take: 5,
        });
        return res.json({
            totalUsers,
            totalSellers,
            pendingSellers,
            totalProducts,
            totalOrders,
            totalRevenue,
            salesOverTime,
            recentPendingSellers,
        });
    }
    catch (error) {
        return handleControllerError(res, error, "Admin stats error:");
    }
});
export default router;
