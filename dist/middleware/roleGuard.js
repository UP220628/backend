"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOverridePermission = validateOverridePermission;
exports.requireRole = requireRole;
exports.requireAnyRole = requireAnyRole;
const helpers_1 = require("../utils/helpers");
// Middleware flexible para validar permisos relacionados a roles.
// Busca el rol del usuario en este orden: res.locals.user.roleName | res.locals.user.role | header 'x-user-role' | body.requesterRole | body.roleName
// Solo permite usar `overrideExisting` cuando el rol es 'WWS'.
function validateOverridePermission(req, res, next) {
    try {
        const wantsOverride = !!req.body && !!req.body.overrideExisting;
        if (!wantsOverride)
            return next();
        const role = (0, helpers_1.resolveUserRole)(req, res);
        if (role && role.toUpperCase() === 'WWS')
            return next();
        return res.status(403).json({ ok: false, error: 'Only WWS users can use overrideExisting' });
    }
    catch (err) {
        return res.status(500).json({ ok: false, error: 'Role validation failed' });
    }
}
exports.default = {};
function requireRole(roleName) {
    return (req, res, next) => {
        const role = (0, helpers_1.resolveUserRole)(req, res);
        if (role && role.toUpperCase() === roleName.toUpperCase())
            return next();
        return res.status(403).json({ ok: false, error: `Requires role ${roleName}` });
    };
}
function requireAnyRole(roleNames) {
    const normalized = roleNames.map(name => name.toUpperCase());
    return (req, res, next) => {
        const role = (0, helpers_1.resolveUserRole)(req, res)?.toUpperCase();
        if (role && normalized.includes(role))
            return next();
        return res.status(403).json({ ok: false, error: `Requires one of roles: ${roleNames.join(', ')}` });
    };
}
//# sourceMappingURL=roleGuard.js.map