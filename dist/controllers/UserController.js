"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUser = exports.updateUser = exports.listUsers = exports.createUser = void 0;
const UserService_1 = require("../services/UserService");
const createUser = async (req, res) => {
    try {
        const data = req.body || {};
        const created = await UserService_1.userService.createUser(data);
        return res.status(201).json({ ok: true, data: created });
    }
    catch (err) {
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
exports.createUser = createUser;
const listUsers = async (_req, res) => {
    try {
        const rows = await UserService_1.userService.listUsers();
        res.json({ ok: true, data: rows });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};
exports.listUsers = listUsers;
const updateUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        const data = req.body || {};
        const updated = await UserService_1.userService.updateUser(id, data);
        res.json({ ok: true, data: updated });
    }
    catch (err) {
        if (err.message?.includes('Missing id')) {
            return res.status(400).json({ ok: false, error: err.message });
        }
        res.status(500).json({ ok: false, error: err.message });
    }
};
exports.updateUser = updateUser;
const deleteUser = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await UserService_1.userService.deleteUser(id);
        res.json({ ok: true });
    }
    catch (err) {
        if (err.message?.includes('Missing id')) {
            return res.status(400).json({ ok: false, error: err.message });
        }
        res.status(500).json({ ok: false, error: err.message });
    }
};
exports.deleteUser = deleteUser;
//# sourceMappingURL=UserController.js.map