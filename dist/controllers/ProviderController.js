"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteProvider = exports.createProvider = exports.listProviders = void 0;
const ProviderService_1 = require("../services/ProviderService");
const listProviders = async (_req, res) => {
    try {
        const rows = await ProviderService_1.providerService.listProviders();
        res.json({ ok: true, data: rows });
    }
    catch (err) {
        res.status(500).json({ ok: false, error: err.message });
    }
};
exports.listProviders = listProviders;
const createProvider = async (req, res) => {
    try {
        const data = req.body || {};
        const result = await ProviderService_1.providerService.createProvider(data);
        res.status(201).json({ ok: true, data: result });
    }
    catch (err) {
        if (err.message?.includes('Missing provider name')) {
            return res.status(400).json({ ok: false, error: err.message });
        }
        if (err && (err.code === '23505' || err.message?.includes('unique'))) {
            return res.status(409).json({ ok: false, error: 'Provider already exists' });
        }
        res.status(500).json({ ok: false, error: err.message });
    }
};
exports.createProvider = createProvider;
const deleteProvider = async (req, res) => {
    try {
        const id = Number(req.params.id);
        await ProviderService_1.providerService.deleteProvider(id);
        res.json({ ok: true });
    }
    catch (err) {
        if (err.message?.includes('Missing provider id')) {
            return res.status(400).json({ ok: false, error: err.message });
        }
        res.status(500).json({ ok: false, error: err.message });
    }
};
exports.deleteProvider = deleteProvider;
//# sourceMappingURL=ProviderController.js.map