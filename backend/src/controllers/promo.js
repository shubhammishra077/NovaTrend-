import { prisma } from "../lib/prisma.js";
import { ApiError, handleControllerError } from "../lib/api-response.js";
import { parseNumber, requireArray, requireObject, requireObjectId, requireString } from "../lib/request-validation.js";
function parseOptionalDate(value) {
    if (value === undefined || value === null || value === "") {
        return null;
    }
    const date = new Date(requireString(value, "expiresAt", { max: 100 }));
    if (Number.isNaN(date.getTime())) {
        throw new ApiError(400, "expiresAt must be a valid date.", "VALIDATION_ERROR", { field: "expiresAt" });
    }
    return date;
}
export async function listSellerPromos(req, res) {
    try {
        const session = req.session;
        const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
        if (!seller)
            return res.status(404).json({ error: "Seller profile not found" });
        const promos = await prisma.promo.findMany({ where: { sellerId: seller.id }, orderBy: { createdAt: "desc" } });
        return res.json({ promos });
    }
    catch (e) {
        return handleControllerError(res, e, "listSellerPromos");
    }
}
export async function createPromo(req, res) {
    try {
        requireObject(req.body);
        const session = req.session;
        const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
        if (!seller)
            return res.status(404).json({ error: "Seller profile not found" });
        if (!seller.approved) {
            if (seller.revokedAt) {
                return res.status(403).json({ error: "Your seller account has been revoked." });
            }
            return res.status(403).json({ error: "Your seller account is pending approval." });
        }
        const { discountPercent, active, expiresAt } = req.body;
        const upper = requireString(req.body.code, "code", { min: 3, max: 20 }).toUpperCase();
        const discount = parseNumber(discountPercent, "discountPercent", { min: 1, max: 90 });
        if (active !== undefined && typeof active !== "boolean") {
            throw new ApiError(400, "active must be a boolean.", "VALIDATION_ERROR", { field: "active" });
        }
        const expirationDate = parseOptionalDate(expiresAt);
        const existing = await prisma.promo.findFirst({ where: { code: upper, sellerId: seller.id } });
        if (existing)
            return res.status(409).json({ error: "Code already exists for this seller" });
        const promo = await prisma.promo.create({
            data: {
                code: upper,
                discountPercent: discount,
                active: active ?? true,
                sellerId: seller.id,
                expiresAt: expirationDate,
            },
        });
        return res.status(201).json({ promo });
    }
    catch (e) {
        return handleControllerError(res, e, "createPromo");
    }
}
export async function updatePromo(req, res) {
    try {
        requireObject(req.body);
        const session = req.session;
        const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
        if (!seller)
            return res.status(404).json({ error: "Seller profile not found" });
        const id = requireObjectId(req.params.id, "id");
        const existing = await prisma.promo.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Promo not found" });
        if (existing.sellerId !== seller.id)
            return res.status(403).json({ error: "Not your promo" });
        const { code, discountPercent, active, expiresAt } = req.body;
        const data = {};
        if (code !== undefined) {
            const upper = requireString(code, "code", { min: 3, max: 20 }).toUpperCase();
            if (upper !== existing.code) {
                const dup = await prisma.promo.findFirst({ where: { code: upper, sellerId: seller.id } });
                if (dup)
                    return res.status(409).json({ error: "Code already exists for this seller" });
            }
            data.code = upper;
        }
        if (discountPercent !== undefined) {
            const d = parseNumber(discountPercent, "discountPercent", { min: 1, max: 90 });
            data.discountPercent = d;
        }
        if (active !== undefined) {
            if (typeof active !== "boolean") {
                throw new ApiError(400, "active must be a boolean.", "VALIDATION_ERROR", { field: "active" });
            }
            data.active = active;
        }
        if (expiresAt !== undefined) {
            data.expiresAt = parseOptionalDate(expiresAt);
        }
        const promo = await prisma.promo.update({ where: { id }, data });
        return res.json({ promo });
    }
    catch (e) {
        return handleControllerError(res, e, "updatePromo");
    }
}
export async function deletePromo(req, res) {
    try {
        const session = req.session;
        const seller = await prisma.seller.findUnique({ where: { userId: session.user.id } });
        if (!seller)
            return res.status(404).json({ error: "Seller profile not found" });
        const id = requireObjectId(req.params.id, "id");
        const existing = await prisma.promo.findUnique({ where: { id } });
        if (!existing)
            return res.status(404).json({ error: "Promo not found" });
        if (existing.sellerId !== seller.id)
            return res.status(403).json({ error: "Not your promo" });
        await prisma.promo.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (e) {
        return handleControllerError(res, e, "deletePromo");
    }
}
export async function validatePromo(req, res) {
    try {
        requireObject(req.body);
        const upper = requireString(req.body.code, "code", { max: 20 }).toUpperCase();
        const sellerIds = req.body.sellerIds === undefined
            ? []
            : requireArray(req.body.sellerIds, "sellerIds", { max: 50 })
                .map((id, index) => requireObjectId(id, `sellerIds[${index}]`));
        const now = new Date();
        const promos = await prisma.promo.findMany({
            where: {
                code: upper,
                active: true,
                OR: [{ sellerId: null }, { seller: { approved: true } }],
            },
        });
        const valid = promos.filter((p) => {
            if (p.expiresAt && new Date(p.expiresAt) < now)
                return false;
            return true;
        });
        if (valid.length === 0)
            return res.status(404).json({ error: "Invalid or expired promo code" });
        // Prefer seller-specific promo that matches cart sellers
        const sellerSet = new Set(sellerIds);
        const sellerMatch = valid.find((p) => p.sellerId && sellerSet.has(p.sellerId));
        if (sellerMatch) {
            const seller = await prisma.seller.findUnique({ where: { id: sellerMatch.sellerId }, select: { name: true, approved: true } });
            if (!seller?.approved)
                return res.status(404).json({ error: "Promo not applicable to items in your cart" });
            return res.json({ valid: true, promo: sellerMatch, sellerName: seller?.name ?? null });
        }
        const globalMatch = valid.find((p) => !p.sellerId);
        if (globalMatch)
            return res.json({ valid: true, promo: globalMatch, sellerName: null });
        // If promo exists but seller mismatch
        return res.status(404).json({ error: "Promo not applicable to items in your cart" });
    }
    catch (e) {
        return handleControllerError(res, e, "validatePromo");
    }
}
