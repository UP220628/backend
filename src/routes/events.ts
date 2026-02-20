import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { addUnitEventClient, removeUnitEventClient } from '../realtime/unitEventStream';

const router = Router();

router.get('/units', (req: Request, res: Response) => {
  const token = typeof req.query.token === 'string' ? req.query.token : undefined;
  if (!token) {
    return res.status(401).json({ ok: false, error: 'Missing token' });
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    return res.status(500).json({ ok: false, error: 'JWT_SECRET not configured on server' });
  }

  let userPlant: string | undefined;
  try {
    const payload = jwt.verify(token, jwtSecret) as any;
    // Extract plant from JWT for plant-aware SSE filtering
    userPlant = payload.plant;
  } catch (err: any) {
    return res.status(401).json({ ok: false, error: 'Invalid token' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('event: connected\ndata: {"ok": true}\n\n');

  addUnitEventClient(res, userPlant);

  const keepAlive = setInterval(() => {
    res.write(':keep-alive\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    removeUnitEventClient(res);
  });
});

export default router;
