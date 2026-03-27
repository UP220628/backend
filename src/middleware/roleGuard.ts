import { Request, Response, NextFunction } from 'express';
import { resolveUserRole } from '../utils/helpers';

// Middleware flexible para validar permisos relacionados a roles.
// Busca el rol del usuario en este orden: res.locals.user.roleName | res.locals.user.role | header 'x-user-role' | body.requesterRole | body.roleName
// Solo permite usar `overrideExisting` cuando el rol es 'WWS'.
export function validateOverridePermission(req: Request, res: Response, next: NextFunction) {
	try {
		const wantsOverride = !!req.body && !!req.body.overrideExisting;
		if (!wantsOverride) return next();

		const role = resolveUserRole(req, res);
		if (role && role.toUpperCase() === 'WWS') return next();

		return res.status(403).json({ ok: false, error: 'Only WWS users can use overrideExisting' });
	} catch (err: any) {
		return res.status(500).json({ ok: false, error: 'Role validation failed' });
	}
}

export default {};

export function requireRole(roleName: string) {
	return (req: Request, res: Response, next: NextFunction) => {
		const role = resolveUserRole(req, res);
		if (role && role.toUpperCase() === roleName.toUpperCase()) return next();
		return res.status(403).json({ ok: false, error: `Requires role ${roleName}` });
	};
}

export function requireAnyRole(roleNames: string[]) {
	const normalized = roleNames.map(name => name.toUpperCase());
	return (req: Request, res: Response, next: NextFunction) => {
		const role = resolveUserRole(req, res)?.toUpperCase();
		if (role && normalized.includes(role)) return next();
		return res.status(403).json({ ok: false, error: `Requires one of roles: ${roleNames.join(', ')}` });
	};
}

