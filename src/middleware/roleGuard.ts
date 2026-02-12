import { Request, Response, NextFunction } from 'express';

// Middleware flexible para validar permisos relacionados a roles.
// Busca el rol del usuario en este orden: res.locals.user.roleName | res.locals.user.role | header 'x-user-role' | body.requesterRole | body.roleName
// Solo permite usar `overrideExisting` cuando el rol es 'WWS'.
export function validateOverridePermission(req: Request, res: Response, next: NextFunction) {
	try {
		const wantsOverride = !!req.body && !!req.body.overrideExisting;
		if (!wantsOverride) return next();

		const localUser: any = (res.locals && (res.locals as any).user) || null;
		const roleCandidates = [
			localUser?.roleName,
			localUser?.role,
			(req.headers['x-user-role'] as string) || undefined,
			req.body?.requesterRole,
			req.body?.roleName,
		];

		const role = roleCandidates.find(r => typeof r === 'string') as string | undefined;
		if (role && role.toUpperCase() === 'WWS') return next();

		return res.status(403).json({ ok: false, error: 'Only WWS users can use overrideExisting' });
	} catch (err: any) {
		return res.status(500).json({ ok: false, error: 'Role validation failed' });
	}
}

export default {};

export function requireRole(roleName: string) {
	return (req: Request, res: Response, next: NextFunction) => {
		const localUser: any = (res.locals && (res.locals as any).user) || null;
		const roleCandidates = [
			localUser?.roleName,
			localUser?.role,
			(req.headers['x-user-role'] as string) || undefined,
			req.body?.requesterRole,
			req.body?.roleName,
		];
		const role = roleCandidates.find(r => typeof r === 'string') as string | undefined;
		if (role && role.toUpperCase() === roleName.toUpperCase()) return next();
		return res.status(403).json({ ok: false, error: `Requires role ${roleName}` });
	};
}

