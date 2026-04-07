import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { addUnitEventClient, removeUnitEventClient } from '../realtime/unitEventStream';
import { env } from '../config/environment';
import { ROLE_IDS, SSE_KEEPALIVE_MS } from '../constants';

const router = Router();

router.get('/units', (req: Request, res: Response) => {
  let userPlant: string | undefined;

  const authUser = (res.locals as any)?.user as { roleId?: number; plant?: string } | undefined;
  if (authUser) {
    userPlant = authUser.roleId === ROLE_IDS.ADMIN ? undefined : authUser.plant;
  } else {
    const token = typeof req.query.token === 'string' ? req.query.token : undefined;
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Missing authentication token' });
    }

    try {
      const payload = jwt.verify(token, env.jwtSecret) as any;
      const roleId = Number(payload.roleId);
      userPlant = roleId === ROLE_IDS.ADMIN ? undefined : payload.plant;
    } catch (err: any) {
      return res.status(401).json({ ok: false, error: 'Invalid token' });
    }
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  res.write('event: connected\ndata: {"ok": true}\n\n');

  addUnitEventClient(res, userPlant);

  const keepAlive = setInterval(() => {
    res.write(':keep-alive\n\n');
  }, SSE_KEEPALIVE_MS);

  req.on('close', () => {
    clearInterval(keepAlive);
    removeUnitEventClient(res);
  });
});

export default router;
