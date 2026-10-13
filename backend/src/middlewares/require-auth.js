import { getRequestSession } from "../lib/request-session.js";
import { sendApiError } from "../lib/api-response.js";
import { ApiError } from "../lib/api-response.js";
export async function requireAuth(req, res, next) {
    try {
        const session = await getRequestSession(req);
        if (!session) {
            return sendApiError(res, new ApiError(401, "Unauthorized", "UNAUTHORIZED"));
        }
        req.session = session;
        next();
    }
    catch (error) {
        return next(error);
    }
}
