"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCarrierProviderId = getCarrierProviderId;
exports.getUserPlantFilter = getUserPlantFilter;
exports.buildDateFilter = buildDateFilter;
exports.getTokenFromHeader = getTokenFromHeader;
exports.resolveUserRole = resolveUserRole;
const constants_1 = require("../constants");
const database_1 = __importDefault(require("../config/database"));
/**
 * Returns the provider ID if the user is a CARRIER, otherwise undefined.
 * Used for automatically filtering data by the carrier's provider.
 */
function getCarrierProviderId(user) {
    return user?.roleId === constants_1.ROLE_IDS.CARRIER && user.providerId
        ? user.providerId
        : undefined;
}
/**
 * Returns the user's plant filter.
 * ADMIN users see all plants (returns undefined), others see only their plant.
 */
function getUserPlantFilter(user) {
    return user?.roleId === constants_1.ROLE_IDS.ADMIN ? undefined : user?.plant;
}
/**
 * Builds a date-range SQL fragment for dashboard queries.
 */
function buildDateFilter(filter) {
    if (filter === 'today') {
        return (0, database_1.default) `AND (u."createdAt" AT TIME ZONE 'America/Mexico_City')::date = (NOW() AT TIME ZONE 'America/Mexico_City')::date`;
    }
    if (filter === 'week') {
        return (0, database_1.default) `AND u."createdAt" >= NOW() - INTERVAL '7 days'`;
    }
    if (filter === 'month') {
        return (0, database_1.default) `AND u."createdAt" >= NOW() - INTERVAL '30 days'`;
    }
    return (0, database_1.default) ``;
}
/**
 * Extracts the Bearer token from the Authorization header.
 */
function getTokenFromHeader(req) {
    return req.headers.authorization?.replace('Bearer ', '') || undefined;
}
/**
 * Resolves the user's role name from multiple sources in priority order:
 * res.locals.user.roleName > res.locals.user.role > x-user-role header > body.requesterRole > body.roleName
 */
function resolveUserRole(req, res) {
    const localUser = (res.locals && res.locals.user) || null;
    const roleFromId = typeof localUser?.roleId === 'number'
        ? Object.entries(constants_1.ROLE_IDS).find(([, value]) => value === localUser.roleId)?.[0]
        : undefined;
    const roleCandidates = [
        roleFromId,
        localUser?.roleName,
        localUser?.role,
        req.headers['x-user-role'] || undefined,
        req.body?.requesterRole,
        req.body?.roleName,
    ];
    return roleCandidates.find((r) => typeof r === 'string');
}
//# sourceMappingURL=helpers.js.map