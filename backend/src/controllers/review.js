import { prisma } from "../lib/prisma.js";
import { handleControllerError } from "../lib/api-response.js";
import { parseInteger, requireObject, requireObjectId, requireString } from "../lib/request-validation.js";
import { PAYMENT_STATUS } from "../lib/api-constants.js";
async function hasPurchased(userId, productId) {
    const order = await prisma.order.findFirst({
        where: {
            userId,
            items: { some: { productId } },
            NOT: [{ paymentStatus: PAYMENT_STATUS.FAILED }],
        },
        select: { id: true },
    });
    return !!order;
}
export async function listReviews(req, res) {
    try {
        const productId = requireObjectId(req.params.productId, "productId");
        const reviews = await prisma.review.findMany({
            where: { productId },
            include: {
                user: { select: { id: true, name: true, image: true } },
                comments: {
                    include: { user: { select: { id: true, name: true, image: true } } },
                    orderBy: { createdAt: "asc" },
                },
            },
            orderBy: { createdAt: "desc" },
        });
        const total = reviews.length;
        const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
        return res.json({ reviews, avg, total });
    }
    catch (e) {
        return handleControllerError(res, e, "listReviews");
    }
}
export async function canReview(req, res) {
    try {
        const session = req.session;
        const productId = requireObjectId(req.params.productId, "productId");
        const userId = session.user.id;
        const purchased = await hasPurchased(userId, productId);
        const existing = await prisma.review.findUnique({
            where: { productId_userId: { productId, userId } },
        });
        return res.json({
            canReview: purchased && !existing,
            hasPurchased: purchased,
            hasReviewed: !!existing,
            review: existing ?? null,
        });
    }
    catch (e) {
        return handleControllerError(res, e, "canReview");
    }
}
export async function createReview(req, res) {
    try {
        requireObject(req.body);
        const session = req.session;
        const userId = session.user.id;
        const { rating } = req.body;
        const productId = requireObjectId(req.body.productId, "productId");
        const r = parseInteger(rating, "rating", { min: 1, max: 5 });
        const comment = requireString(req.body.comment, "comment", { min: 10, max: 2000 });
        const product = await prisma.product.findUnique({ where: { id: productId } });
        if (!product)
            return res.status(404).json({ error: "Product not found" });
        const purchased = await hasPurchased(userId, productId);
        if (!purchased)
            return res.status(403).json({ error: "Only purchasers can review" });
        const existing = await prisma.review.findUnique({ where: { productId_userId: { productId, userId } } });
        if (existing)
            return res.status(409).json({ error: "You have already reviewed this product" });
        const review = await prisma.review.create({
            data: { productId, userId, rating: r, comment: comment.trim() },
            include: { user: { select: { id: true, name: true, image: true } }, comments: true },
        });
        return res.status(201).json({ review });
    }
    catch (e) {
        return handleControllerError(res, e, "createReview");
    }
}
export async function updateReview(req, res) {
    try {
        requireObject(req.body);
        const session = req.session;
        const userId = session.user.id;
        const id = requireObjectId(req.params.id, "id");
        const { rating, comment } = req.body;
        const existing = await prisma.review.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Review not found" });
        if (existing.userId !== userId)
            return res.status(403).json({ error: "Not your review" });
        const data = {};
        if (rating !== undefined) {
            data.rating = parseInteger(rating, "rating", { min: 1, max: 5 });
        }
        if (comment !== undefined) {
            data.comment = requireString(comment, "comment", { min: 10, max: 2000 });
        }
        const review = await prisma.review.update({
            where: { id },
            data,
            include: { user: { select: { id: true, name: true, image: true } }, comments: { include: { user: { select: { id: true, name: true, image: true } } } } },
        });
        return res.json({ review });
    }
    catch (e) {
        return handleControllerError(res, e, "updateReview");
    }
}
export async function deleteReview(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const id = requireObjectId(req.params.id, "id");
        const existing = await prisma.review.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Review not found" });
        if (existing.userId !== userId)
            return res.status(403).json({ error: "Not your review" });
        await prisma.review.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (e) {
        return handleControllerError(res, e, "deleteReview");
    }
}
export async function createComment(req, res) {
    try {
        requireObject(req.body);
        const session = req.session;
        const userId = session.user.id;
        const reviewId = requireObjectId(req.params.reviewId, "reviewId");
        const comment = requireString(req.body.comment, "comment", { min: 2, max: 2000 });
        const review = await prisma.review.findUnique({ where: { id: reviewId } });
        if (!review)
            return res.status(404).json({ error: "Review not found" });
        const created = await prisma.reviewComment.create({
            data: { reviewId, userId, comment: comment.trim() },
            include: { user: { select: { id: true, name: true, image: true } } },
        });
        return res.status(201).json({ comment: created });
    }
    catch (e) {
        return handleControllerError(res, e, "createComment");
    }
}
export async function deleteComment(req, res) {
    try {
        const session = req.session;
        const userId = session.user.id;
        const id = requireObjectId(req.params.commentId, "commentId");
        const existing = await prisma.reviewComment.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Comment not found" });
        if (existing.userId !== userId)
            return res.status(403).json({ error: "Not your comment" });
        await prisma.reviewComment.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (e) {
        return handleControllerError(res, e, "deleteComment");
    }
}
