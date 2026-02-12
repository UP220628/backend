import { Request, Response } from 'express';
import { providerService } from '../services/ProviderService';

export const listProviders = async (_req: Request, res: Response) => {
  try {
    const rows = await providerService.listProviders();
    res.json({ ok: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
};

export const createProvider = async (req: Request, res: Response) => {
  try {
    const data = req.body || {};
    const result = await providerService.createProvider(data);
    res.status(201).json({ ok: true, data: result });
  } catch (err: any) {
    if (err.message?.includes('Missing provider name')) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    if (err && (err.code === '23505' || err.message?.includes('unique'))) {
      return res.status(409).json({ ok: false, error: 'Provider already exists' });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
};

export const deleteProvider = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await providerService.deleteProvider(id);
    res.json({ ok: true });
  } catch (err: any) {
    if (err.message?.includes('Missing provider id')) {
      return res.status(400).json({ ok: false, error: err.message });
    }
    res.status(500).json({ ok: false, error: err.message });
  }
};

