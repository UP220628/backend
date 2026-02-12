import { Request, Response } from 'express';
import { userService } from '../services/UserService';

export const createUser = async (req: Request, res: Response) => {
	try {
		const data = req.body || {};
		const created = await userService.createUser(data);
		return res.status(201).json({ ok: true, data: created as any });
	} catch (err: any) {
		// Manejar violación de unicidad en email
		if (err && err.code && (err.code === '23505' || err.message?.includes('unique'))) {
			return res.status(409).json({ ok: false, error: 'Email already exists' });
		}
		if (err.message?.includes('Missing required fields')) {
			return res.status(400).json({ ok: false, error: err.message });
		}
		if (err.message?.includes('Invalid roleId')) {
			return res.status(400).json({ ok: false, error: err.message });
		}
		if (err.message?.includes('CARRIER role requires')) {
			return res.status(400).json({ ok: false, error: err.message });
		}
		return res.status(500).json({ ok: false, error: err.message });
	}
};

export const listUsers = async (_req: Request, res: Response) => {
	try {
		const rows = await userService.listUsers();
		res.json({ ok: true, data: rows as any });
	} catch (err: any) {
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const updateUser = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		const data = req.body || {};
		const updated = await userService.updateUser(id, data);
		res.json({ ok: true, data: updated as any });
	} catch (err: any) {
		if (err.message?.includes('Missing id')) {
			return res.status(400).json({ ok: false, error: err.message });
		}
		res.status(500).json({ ok: false, error: err.message });
	}
};

export const deleteUser = async (req: Request, res: Response) => {
	try {
		const id = Number(req.params.id);
		await userService.deleteUser(id);
		res.json({ ok: true });
	} catch (err: any) {
		if (err.message?.includes('Missing id')) {
			return res.status(400).json({ ok: false, error: err.message });
		}
		res.status(500).json({ ok: false, error: err.message });
	}
};
