import { isAdmin } from "../lib/order-rules.js";
import { ApiError, sendApiError } from "../lib/api-response.js";
import { getRequestSession } from "../lib/request-session.js";
export async function requireAdmin(req, res, next) {
    try {
        if (!req.session) {
            req.session = await getRequestSession(req);
        }
        if (!req.session) {
            return sendApiError(res, new ApiError(401, "Unauthorized", "UNAUTHORIZED"));
        }
        if (!isAdmin(req.session.user)) {
            return sendApiError(res, new ApiError(403, "Forbidden", "FORBIDDEN"));
        }
        return next();
    }
    catch (error) {
        return next(error);
    }
}
