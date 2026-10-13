import { fromNodeHeaders } from "better-auth/node";
import { auth } from "./auth.js";

export function getRequestSession(req) {
    return auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
}
