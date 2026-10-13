import test from "node:test";
import assert from "node:assert/strict";
import {
    canTransitionDataDeletionStatus,
    DATA_DELETION_STATUS,
    ORDER_STATUS,
    ORDER_STATUSES,
    PAYMENT_STATUS,
    PRODUCT_STATUS,
} from "../src/lib/api-constants.js";
import { ApiError, handleApiError, notFoundApiHandler, sendApiError } from "../src/lib/api-response.js";
import {
    parseBoolean,
    parseInteger,
    parseNumber,
    parsePagination,
    requireArray,
    requireEnum,
    requireIdentifier,
    requireObject,
    requireObjectId,
    requireString,
} from "../src/lib/request-validation.js";

function createResponse() {
    return {
        statusCode: 200,
        body: undefined,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        },
    };
}

test("request validators reject malformed values and preserve valid values", () => {
    assert.equal(requireString("  buyer  ", "name"), "buyer");
    assert.equal(requireEnum(ORDER_STATUS.CONFIRMED, "status", ORDER_STATUSES), ORDER_STATUS.CONFIRMED);
    assert.deepEqual(requireObject({ ok: true }), { ok: true });
    assert.deepEqual(requireArray([1, 2], "items"), [1, 2]);
    assert.equal(requireObjectId("507f1f77bcf86cd799439011"), "507f1f77bcf86cd799439011");
    assert.equal(requireIdentifier("auth_user-123"), "auth_user-123");
    assert.equal(parseInteger("4", "page", { min: 1 }), 4);
    assert.equal(parseNumber("1.5", "price", { min: 0 }), 1.5);

    assert.throws(() => requireString("", "name"), ApiError);
    assert.throws(() => requireEnum("unknown", "status", ORDER_STATUSES), ApiError);
    assert.throws(() => requireObject([]), ApiError);
    assert.throws(() => requireArray({}, "items"), ApiError);
    assert.throws(() => requireObjectId("not-an-id"), ApiError);
    assert.throws(() => requireIdentifier("invalid user id"), ApiError);
    assert.throws(() => parseInteger(["1", "2"], "page"), ApiError);
    assert.throws(() => parseNumber("Infinity", "price"), ApiError);
});

test("pagination and boolean parsing apply defaults and bounds", () => {
    assert.deepEqual(parsePagination({ page: "3", limit: "20" }, { maxLimit: 50 }), {
        page: 3,
        limit: 20,
        skip: 40,
    });
    assert.equal(parseBoolean(undefined, "approved", { defaultValue: undefined }), undefined);
    assert.equal(parseBoolean("", "mine", { defaultValue: false }), false);
    assert.equal(parseBoolean("true", "approved"), true);
    assert.throws(() => parsePagination({ page: "0" }), ApiError);
    assert.throws(() => parsePagination({ limit: "100" }, { maxLimit: 50 }), ApiError);
    assert.throws(() => parseBoolean("yes", "approved"), ApiError);
});

test("shared lifecycle constants allow only valid data-deletion transitions", () => {
    assert.equal(canTransitionDataDeletionStatus(DATA_DELETION_STATUS.PENDING, DATA_DELETION_STATUS.APPROVED), true);
    assert.equal(canTransitionDataDeletionStatus(DATA_DELETION_STATUS.PENDING, DATA_DELETION_STATUS.COMPLETED), false);
    assert.equal(canTransitionDataDeletionStatus(DATA_DELETION_STATUS.COMPLETED, DATA_DELETION_STATUS.APPROVED), false);
    assert.equal(PRODUCT_STATUS.REJECTED, "rejected");
    assert.equal(PAYMENT_STATUS.PAID, "paid");
});

test("API errors use a stable error/code/details envelope", () => {
    const res = createResponse();
    sendApiError(res, new ApiError(400, "Invalid status.", "VALIDATION_ERROR", { field: "status" }));

    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, {
        error: "Invalid status.",
        code: "VALIDATION_ERROR",
        details: { field: "status" },
    });
});

test("malformed JSON and unmatched API routes return stable error envelopes", () => {
    const malformedResponse = createResponse();
    handleApiError(
        Object.assign(new SyntaxError("parse error"), { type: "entity.parse.failed", status: 400 }),
        { method: "POST", path: "/api/orders" },
        malformedResponse,
        () => {},
    );
    assert.equal(malformedResponse.statusCode, 400);
    assert.deepEqual(malformedResponse.body, {
        error: "Malformed JSON request body.",
        code: "INVALID_JSON",
    });

    const notFoundResponse = createResponse();
    notFoundApiHandler({ method: "GET", path: "/api/unknown" }, notFoundResponse);
    assert.equal(notFoundResponse.statusCode, 404);
    assert.deepEqual(notFoundResponse.body, {
        error: "Route GET /api/unknown not found.",
        code: "ROUTE_NOT_FOUND",
    });
});
