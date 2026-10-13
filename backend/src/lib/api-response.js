export class ApiError extends Error {
    constructor(status, message, code, details) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.code = code;
        this.details = details;
    }
}

export function sendApiError(res, error) {
    const status = error instanceof ApiError ? error.status : 500;
    const payload = {
        error: error instanceof ApiError ? error.message : "Internal server error",
        code: error instanceof ApiError ? error.code : "INTERNAL_ERROR",
    };
    if (error instanceof ApiError && error.details !== undefined) {
        payload.details = error.details;
    }
    return res.status(status).json(payload);
}

export function handleControllerError(res, error, operation) {
    if (error instanceof ApiError) {
        return sendApiError(res, error);
    }
    if (error?.code === "P2002") {
        return sendApiError(res, new ApiError(409, "A resource with these details already exists.", "CONFLICT"));
    }
    if (error?.code === "P2025") {
        return sendApiError(res, new ApiError(404, "Resource not found.", "NOT_FOUND"));
    }
    if (error?.code === "P2034") {
        return sendApiError(res, new ApiError(409, "The resource changed during this request. Please retry.", "CONFLICT"));
    }
    console.error(operation, error instanceof Error ? error.message : String(error));
    return sendApiError(res, new ApiError(500, "Internal server error", "INTERNAL_ERROR"));
}

export function handleApiError(error, req, res, _next) {
    if (res.headersSent) {
        return;
    }
    if (error instanceof ApiError) {
        return sendApiError(res, error);
    }
    if (error?.type === "entity.parse.failed" || error instanceof SyntaxError && error.status === 400) {
        return sendApiError(res, new ApiError(400, "Malformed JSON request body.", "INVALID_JSON"));
    }
    if (error?.code === "P2002" || error?.code === "P2025" || error?.code === "P2034") {
        return handleControllerError(res, error, "Unhandled API error");
    }
    console.error("Unhandled API error:", {
        method: req.method,
        path: req.path,
        message: error instanceof Error ? error.message : String(error),
    });
    return sendApiError(res, new ApiError(500, "Internal server error", "INTERNAL_ERROR"));
}

export function notFoundApiHandler(req, res) {
    return sendApiError(res, new ApiError(404, `Route ${req.method} ${req.path} not found.`, "ROUTE_NOT_FOUND"));
}
