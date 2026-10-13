import { prisma } from "../lib/prisma.js";
import { isApprovedSeller } from "../lib/order-rules.js";
import { ROLE } from "../lib/api-constants.js";
import { ApiError, sendApiError } from "../lib/api-response.js";
import { getRequestSession } from "../lib/request-session.js";
export async function requireSeller(req, res, next) {
    try {
        const session = req.session ?? await getRequestSession(req);
        req.session = session;
        if (!session) {
            return sendApiError(res, new ApiError(401, "Unauthorized", "UNAUTHORIZED"));
        }
        if (session.user.role !== ROLE.SELLER) {
            return sendApiError(res, new ApiError(403, "Forbidden: seller access required", "FORBIDDEN"));
        }
        const seller = await prisma.seller.findUnique({
            where: { userId: session.user.id },
            select: { approved: true, revokedAt: true, revokedReason: true },
        });
        if (!isApprovedSeller(seller)) {
            if (seller?.revokedAt) {
                return res.status(403).json({
                    error: "Your seller account has been revoked.",
                    revoked: true,
                    revokedAt: seller.revokedAt,
                    revokedReason: seller.revokedReason,
                });
            }
            return res.status(403).json({
                error: "Your seller account is pending approval.",
                revoked: false,
            });
        }
        next();
    }
    catch (error) {
        return next(error);
    }
}
