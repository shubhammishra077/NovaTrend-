import { ApiError } from "./api-response.js";

export function requireObject(value, field = "body") {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new ApiError(400, `${field} must be an object.`, "VALIDATION_ERROR", { field });
    }
    return value;
}

export function requireString(value, field, { min = 1, max = 2000, trim = true } = {}) {
    if (typeof value !== "string") {
        throw new ApiError(400, `${field} must be a string.`, "VALIDATION_ERROR", { field });
    }
    const normalized = trim ? value.trim() : value;
    if (normalized.length < min || normalized.length > max) {
        throw new ApiError(400, `${field} must be between ${min} and ${max} characters.`, "VALIDATION_ERROR", { field });
    }
    return normalized;
}

export function requireEnum(value, field, allowedValues) {
    if (typeof value !== "string" || !allowedValues.includes(value)) {
        throw new ApiError(400, `${field} must be one of: ${allowedValues.join(", ")}.`, "VALIDATION_ERROR", { field });
    }
    return value;
}

export function parseInteger(value, field, { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, defaultValue } = {}) {
    if ((value === undefined || value === "") && defaultValue !== undefined) {
        return defaultValue;
    }
    const normalized = Array.isArray(value) ? undefined : value;
    const parsed = typeof normalized === "number"
        ? normalized
        : typeof normalized === "string" && /^-?\d+$/.test(normalized)
            ? Number(normalized)
            : NaN;
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max) {
        throw new ApiError(400, `${field} must be an integer between ${min} and ${max}.`, "VALIDATION_ERROR", { field });
    }
    return parsed;
}

export function parseNumber(value, field, { min = -Infinity, max = Infinity, defaultValue } = {}) {
    if ((value === undefined || value === "") && defaultValue !== undefined) {
        return defaultValue;
    }
    const parsed = Array.isArray(value) ? NaN : Number(value);
    if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
        throw new ApiError(400, `${field} must be a number between ${min} and ${max}.`, "VALIDATION_ERROR", { field });
    }
    return parsed;
}

export function parseBoolean(value, field, options = {}) {
    if (value === undefined && Object.hasOwn(options, "defaultValue")) {
        return options.defaultValue;
    }
    if (value === "" && Object.hasOwn(options, "defaultValue")) {
        return options.defaultValue;
    }
    if (value === true || value === "true") {
        return true;
    }
    if (value === false || value === "false") {
        return false;
    }
    throw new ApiError(400, `${field} must be true or false.`, "VALIDATION_ERROR", { field });
}

export function parsePagination(query, { defaultLimit = 10, maxLimit = 50 } = {}) {
    const page = parseInteger(query.page, "page", { min: 1, defaultValue: 1 });
    const limit = parseInteger(query.limit, "limit", { min: 1, max: maxLimit, defaultValue: defaultLimit });
    return { page, limit, skip: (page - 1) * limit };
}

export function requireArray(value, field, { max = 100 } = {}) {
    if (!Array.isArray(value) || value.length > max) {
        throw new ApiError(400, `${field} must be an array with at most ${max} items.`, "VALIDATION_ERROR", { field });
    }
    return value;
}

export function requireObjectId(value, field = "id") {
    if (typeof value !== "string" || !/^[a-f\d]{24}$/i.test(value)) {
        throw new ApiError(400, `${field} must be a valid identifier.`, "VALIDATION_ERROR", { field });
    }
    return value;
}

export function requireIdentifier(value, field = "id") {
    if (typeof value !== "string" || !/^[a-z\d_-]{1,128}$/i.test(value)) {
        throw new ApiError(400, `${field} must be a valid identifier.`, "VALIDATION_ERROR", { field });
    }
    return value;
}
