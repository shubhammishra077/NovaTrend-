import { prisma } from "../lib/prisma.js";
import { UTApi } from "uploadthing/server";
import { canManageProduct } from "../lib/order-rules.js";
import { getRequestSession } from "../lib/request-session.js";
import {
    ORDER_STATUS,
    PRODUCT_CATEGORIES,
    PRODUCT_GENDERS,
    PRODUCT_SORTS,
    PRODUCT_STATUS,
    PRODUCT_STATUSES,
} from "../lib/api-constants.js";
import { ApiError, handleControllerError } from "../lib/api-response.js";
import { parseBoolean, parseInteger, parseNumber, parsePagination, requireArray, requireEnum, requireObject, requireObjectId, requireString } from "../lib/request-validation.js";
const utapi = new UTApi();
function extractFileKey(url) {
    try {
        const parts = url.split("/");
        return parts[parts.length - 1] || null;
    }
    catch {
        return null;
    }
}
function validateProductPayload(body, { partial = false } = {}) {
    requireObject(body);
    const values = {};
    const has = (key) => Object.hasOwn(body, key);
    if (!partial || has("name")) {
        values.name = requireString(body.name, "name", { max: 200 });
    }
    if (!partial || has("price")) {
        values.price = parseNumber(body.price, "price", { min: Number.EPSILON });
    }
    if (!partial || has("category")) {
        values.category = requireEnum(body.category, "category", PRODUCT_CATEGORIES);
    }
    if (has("description")) {
        values.description = body.description === null ? null : requireString(body.description, "description", { min: 0, max: 5000 });
    }
    if (has("discount")) {
        values.discount = parseNumber(body.discount, "discount", { min: 0, max: 100 });
    }
    if (has("stock")) {
        values.stock = parseInteger(body.stock, "stock", { min: 0 });
    }
    for (const key of ["images", "sizes", "colors"]) {
        if (has(key)) {
            values[key] = requireArray(body[key], key, { max: key === "images" ? 20 : 50 })
                .map((value, index) => requireString(value, `${key}[${index}]`, { max: 200 }));
        }
    }
    if (has("gender")) {
        values.gender = body.gender === null ? null : requireEnum(body.gender, "gender", PRODUCT_GENDERS);
    }
    if (has("status")) {
        values.status = requireEnum(body.status, "status", PRODUCT_STATUSES);
    }
    return values;
}
export async function createProduct(req, res) {
    try {
        const values = validateProductPayload(req.body);
        const session = req.session;
        const seller = await prisma.seller.findUnique({
            where: { userId: session.user.id },
        });
        if (!seller) {
            return res.status(404).json({ error: "Seller profile not found" });
        }
        if (!seller.approved) {
            if (seller.revokedAt) {
                return res.status(403).json({ error: "Your seller account has been revoked." });
            }
            return res.status(403).json({ error: "Your seller account is pending approval." });
        }
        const product = await prisma.product.create({
            data: {
                ...values,
                description: values.description || null,
                discount: values.discount ?? 0,
                images: values.images ?? [],
                stock: values.stock ?? 0,
                sizes: values.sizes ?? [],
                colors: values.colors ?? [],
                gender: values.gender || null,
                status: values.status ?? PRODUCT_STATUS.DRAFT,
                sellerId: seller.id,
            },
        });
        return res.status(201).json({ product });
    }
    catch (error) {
        return handleControllerError(res, error, "Error creating product:");
    }
}
export async function listProducts(req, res) {
    try {
        const { page, limit } = parsePagination(req.query, { defaultLimit: 10, maxLimit: 100 });
        const search = req.query.search === undefined ? "" : requireString(req.query.search, "search", { min: 0, max: 120 });
        const category = req.query.category === undefined || req.query.category === "" ? "" : requireEnum(req.query.category, "category", PRODUCT_CATEGORIES);
        const gender = req.query.gender === undefined || req.query.gender === "" ? "" : requireEnum(req.query.gender, "gender", PRODUCT_GENDERS);
        const status = req.query.status === undefined || req.query.status === "" ? "" : requireEnum(req.query.status, "status", PRODUCT_STATUSES);
        const mine = parseBoolean(req.query.mine, "mine", { defaultValue: false });
        const sellerIdParam = req.query.sellerId === undefined || req.query.sellerId === ""
            ? ""
            : requireObjectId(req.query.sellerId, "sellerId");
        const minPrice = req.query.minPrice === undefined || req.query.minPrice === "" ? undefined : parseNumber(req.query.minPrice, "minPrice", { min: 0 });
        const maxPrice = req.query.maxPrice === undefined || req.query.maxPrice === "" ? undefined : parseNumber(req.query.maxPrice, "maxPrice", { min: 0 });
        const ratingParam = req.query.rating === undefined || req.query.rating === "" ? undefined : parseNumber(req.query.rating, "rating", { min: 0, max: 5 });
        const sort = req.query.sort === undefined || req.query.sort === "" ? "newest" : requireEnum(req.query.sort, "sort", PRODUCT_SORTS);
        if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
            throw new ApiError(400, "minPrice cannot exceed maxPrice.", "VALIDATION_ERROR", { field: "minPrice" });
        }
        const where = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
                { category: { contains: search, mode: "insensitive" } },
            ];
        }
        if (category) {
            where.category = category;
        }
        if (gender) {
            where.gender = gender;
        }
        if (mine && status) {
            where.status = status;
        } else if (!mine) {
            if (status && status !== PRODUCT_STATUS.ACTIVE) {
                throw new ApiError(400, "Public listings only support active products.", "VALIDATION_ERROR", { field: "status" });
            }
            where.status = PRODUCT_STATUS.ACTIVE;
        }
        if (sellerIdParam) {
            where.sellerId = sellerIdParam;
        }
        // Public listings: hide products from sellers who are not approved
        if (!mine) {
            const approvedSellerIds = await prisma.seller.findMany({
                where: { approved: true },
                select: { id: true },
            }).then((sellers) => sellers.map((s) => s.id));
            if (approvedSellerIds.length === 0) {
                return res.json({ products: [], total: 0, page, limit, totalPages: 1 });
            }
            where.AND = [...(where.AND ?? []), { sellerId: { in: approvedSellerIds } }];
        }
        if (mine) {
            const session = req.session ?? await getRequestSession(req);
            if (!session) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const seller = await prisma.seller.findUnique({
                where: { userId: session.user.id },
                select: { id: true },
            });
            if (!seller) {
                return res.status(404).json({ error: "Seller profile not found" });
            }
            where.sellerId = seller.id;
        }
        const needsMemoryProcessing = Boolean((minPrice !== undefined && !isNaN(minPrice)) ||
            (maxPrice !== undefined && !isNaN(maxPrice)) ||
            (ratingParam !== undefined && !isNaN(ratingParam)) ||
            sort);
        if (!needsMemoryProcessing) {
            const skip = (page - 1) * limit;
            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where: where,
                    include: { seller: { select: { id: true, name: true, image: true, username: true } } },
                    orderBy: { createdAt: "desc" },
                    skip,
                    take: limit,
                }),
                prisma.product.count({ where: where }),
            ]);
            const productIds = products.map((p) => p.id);
            let ratingMap = new Map();
            let salesMap = new Map();
            if (productIds.length) {
                const [reviews, orderItems] = await Promise.all([
                    prisma.review.findMany({ where: { productId: { in: productIds } }, select: { productId: true, rating: true } }),
                    prisma.orderItem.findMany({ where: { productId: { in: productIds }, order: { status: { not: ORDER_STATUS.CANCELLED } } }, select: { productId: true, orderId: true } }),
                ]);
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
                const sMap = new Map();
                for (const it of orderItems) {
                    const set = sMap.get(it.productId) ?? new Set();
                    set.add(it.orderId);
                    sMap.set(it.productId, set);
                }
                salesMap = new Map(Array.from(sMap.entries()).map(([k, v]) => [k, v.size]));
            }
            const enriched = products.map((p) => ({
                ...p,
                avgRating: ratingMap.get(p.id)?.avg ?? 0,
                totalReviews: ratingMap.get(p.id)?.total ?? 0,
                unitsSold: salesMap.get(p.id) ?? 0,
            }));
            const totalPages = Math.ceil(total / limit) || 1;
            return res.json({ products: enriched, total, page, limit, totalPages });
        }
        const allProducts = await prisma.product.findMany({
            where: where,
            include: { seller: { select: { id: true, name: true, image: true, username: true } } },
        });
        const productIds = allProducts.map((p) => p.id);
        let ratingMap = new Map();
        let salesMap = new Map();
        if (productIds.length) {
            const [reviews, orderItems] = await Promise.all([
                prisma.review.findMany({ where: { productId: { in: productIds } }, select: { productId: true, rating: true } }),
                prisma.orderItem.findMany({ where: { productId: { in: productIds }, order: { status: { not: ORDER_STATUS.CANCELLED } } }, select: { productId: true, orderId: true } }),
            ]);
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
            const sMap = new Map();
            for (const it of orderItems) {
                const set = sMap.get(it.productId) ?? new Set();
                set.add(it.orderId);
                sMap.set(it.productId, set);
            }
            salesMap = new Map(Array.from(sMap.entries()).map(([k, v]) => [k, v.size]));
        }
        let enriched = allProducts.map((p) => {
            const discounted = p.discount > 0 ? p.price * (1 - p.discount / 100) : p.price;
            return {
                ...p,
                discountedPrice: discounted,
                avgRating: ratingMap.get(p.id)?.avg ?? 0,
                totalReviews: ratingMap.get(p.id)?.total ?? 0,
                unitsSold: salesMap.get(p.id) ?? 0,
            };
        });
        if (minPrice !== undefined && !isNaN(minPrice))
            enriched = enriched.filter((p) => p.discountedPrice >= minPrice);
        if (maxPrice !== undefined && !isNaN(maxPrice))
            enriched = enriched.filter((p) => p.discountedPrice <= maxPrice);
        if (ratingParam !== undefined && !isNaN(ratingParam))
            enriched = enriched.filter((p) => p.avgRating >= ratingParam);
        if (sort === "price_asc")
            enriched.sort((a, b) => a.discountedPrice - b.discountedPrice);
        else if (sort === "price_desc")
            enriched.sort((a, b) => b.discountedPrice - a.discountedPrice);
        else if (sort === "rating_desc")
            enriched.sort((a, b) => b.avgRating - a.avgRating || b.totalReviews - a.totalReviews);
        else if (sort === "newest")
            enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        else
            enriched.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const total = enriched.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const start = (page - 1) * limit;
        const paginated = enriched.slice(start, start + limit).map(({ discountedPrice: _d, ...rest }) => rest);
        return res.json({ products: paginated, total, page, limit, totalPages });
    }
    catch (error) {
        return handleControllerError(res, error, "Error listing products:");
    }
}
export async function getBestSellers(req, res) {
    try {
        const limit = parseInteger(req.query.limit, "limit", { min: 1, max: 12, defaultValue: 6 });
        const approvedSellerIds = await prisma.seller.findMany({
            where: { approved: true },
            select: { id: true },
        }).then((sellers) => sellers.map((s) => s.id));
        if (approvedSellerIds.length === 0) {
            return res.json({ bestSellers: [] });
        }
        const approvedProductIds = await prisma.product.findMany({
            where: { sellerId: { in: approvedSellerIds } },
            select: { id: true },
        }).then((products) => products.map((p) => p.id));
        if (approvedProductIds.length === 0) {
            return res.json({ bestSellers: [] });
        }
        const orderItems = await prisma.orderItem.findMany({
            where: { order: { status: { not: ORDER_STATUS.CANCELLED } }, productId: { in: approvedProductIds } },
            select: {
                productId: true,
                quantity: true,
                price: true,
                orderId: true,
                product: {
                    select: {
                        id: true,
                        name: true,
                        description: true,
                        images: true,
                        price: true,
                        discount: true,
                        category: true,
                        stock: true,
                        sizes: true,
                        colors: true,
                        gender: true,
                        sellerId: true,
                        createdAt: true,
                        updatedAt: true,
                        seller: { select: { id: true, name: true, image: true, username: true } },
                    },
                },
            },
        });
        const map = new Map();
        for (const it of orderItems) {
            if (!it.product)
                continue;
            const ex = map.get(it.productId);
            if (!ex)
                map.set(it.productId, { product: it.product, unitsSold: it.quantity, revenue: it.price * it.quantity, orders: new Set([it.orderId]) });
            else {
                ex.unitsSold += it.quantity;
                ex.revenue += it.price * it.quantity;
                ex.orders.add(it.orderId);
            }
        }
        let sorted = Array.from(map.values())
            .map((v) => ({ product: v.product, unitsSold: v.unitsSold, revenue: Math.round(v.revenue * 100) / 100, orders: v.orders.size }))
            .sort((a, b) => b.orders - a.orders || b.unitsSold - a.unitsSold || b.revenue - a.revenue)
            .slice(0, limit);
        if (sorted.length === 0) {
            return res.json({ bestSellers: [] });
        }
        const productIds = sorted.map((s) => s.product.id);
        const reviews = await prisma.review.findMany({ where: { productId: { in: productIds } }, select: { productId: true, rating: true } });
        const rMap = new Map();
        for (const r of reviews) {
            const arr = rMap.get(r.productId) ?? [];
            arr.push(r.rating);
            rMap.set(r.productId, arr);
        }
        const ratingMap = new Map();
        for (const [pid, ratings] of rMap) {
            const total = ratings.length;
            const avg = total ? ratings.reduce((s, v) => s + v, 0) / total : 0;
            ratingMap.set(pid, { avg: Number(avg.toFixed(1)), total });
        }
        const enriched = sorted.map((s) => ({
            ...s,
            product: { ...s.product, avgRating: ratingMap.get(s.product.id)?.avg ?? 0, totalReviews: ratingMap.get(s.product.id)?.total ?? 0 },
        }));
        return res.json({ bestSellers: enriched });
    }
    catch (e) {
        return handleControllerError(res, e, "getBestSellers");
    }
}
export async function getProduct(req, res) {
    try {
        const id = requireObjectId(req.params.id, "id");
        const product = await prisma.product.findUnique({
            where: { id },
            include: { seller: { select: { id: true, name: true, image: true, username: true, approved: true } } },
        });
        if (!product) {
            return res.status(404).json({ error: "Product not found" });
        }
        if (!product.seller?.approved) {
            return res.status(404).json({ error: "Product not found" });
        }
        const [reviews, orderItems] = await Promise.all([
            prisma.review.findMany({ where: { productId: id }, select: { rating: true } }),
            prisma.orderItem.findMany({ where: { productId: id, order: { status: { not: ORDER_STATUS.CANCELLED } } }, select: { orderId: true } }),
        ]);
        const totalReviews = reviews.length;
        const avgRating = totalReviews ? Number((reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1)) : 0;
        const unitsSold = new Set(orderItems.map((o) => o.orderId)).size;
        return res.json({ product: { ...product, avgRating, totalReviews, unitsSold } });
    }
    catch (error) {
        return handleControllerError(res, error, "Error fetching product:");
    }
}
export async function updateProduct(req, res) {
    try {
        const values = validateProductPayload(req.body, { partial: true });
        const session = req.session;
        const id = requireObjectId(req.params.id, "id");
        const seller = await prisma.seller.findUnique({
            where: { userId: session.user.id },
        });
        if (!seller) {
            return res.status(404).json({ error: "Seller profile not found" });
        }
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: "Product not found" });
        }
        if (!canManageProduct(session.user, seller, existing)) {
            return res.status(403).json({ error: "Not authorized to update this product" });
        }
        if (existing.status === PRODUCT_STATUS.REJECTED) {
            return res.status(403).json({ error: "This product has been rejected by an admin and cannot be edited. Please contact support for details." });
        }
        const product = await prisma.product.update({
            where: { id },
            data: {
                ...values,
                ...(values.description !== undefined && { description: values.description || null }),
                ...(values.gender !== undefined && { gender: values.gender || null }),
            },
        });
        return res.json({ product });
    }
    catch (error) {
        return handleControllerError(res, error, "Error updating product:");
    }
}
export async function deleteProduct(req, res) {
    try {
        const session = req.session;
        const id = requireObjectId(req.params.id, "id");
        const seller = await prisma.seller.findUnique({
            where: { userId: session.user.id },
        });
        if (!seller) {
            return res.status(404).json({ error: "Seller profile not found" });
        }
        const existing = await prisma.product.findUnique({ where: { id } });
        if (!existing) {
            return res.status(404).json({ error: "Product not found" });
        }
        if (!canManageProduct(session.user, seller, existing)) {
            return res.status(403).json({ error: "Not authorized to delete this product" });
        }
        if (existing.status === PRODUCT_STATUS.REJECTED) {
            return res.status(403).json({ error: "This product has been rejected by an admin and cannot be deleted. Please contact support for details." });
        }
        const fileKeys = existing.images
            .map(extractFileKey)
            .filter((k) => k !== null);
        if (fileKeys.length > 0) {
            await utapi.deleteFiles(fileKeys);
        }
        await prisma.product.delete({ where: { id } });
        return res.json({ success: true });
    }
    catch (error) {
        return handleControllerError(res, error, "Error deleting product:");
    }
}
