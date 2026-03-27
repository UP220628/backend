"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = void 0;
/**
 * Wraps an async route handler to catch errors and return a consistent
 * `{ ok: false, error }` response, eliminating repetitive try/catch blocks.
 */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch((err) => {
    res.status(500).json({ ok: false, error: err.message ?? 'Internal server error' });
});
exports.asyncHandler = asyncHandler;
//# sourceMappingURL=asyncHandler.js.map