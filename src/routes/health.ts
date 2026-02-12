import { Router } from 'express';
import { getPool } from '../config/database';

const router = Router();

router.get('/db', async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.query('SELECT 1 AS ok');
    res.json({ ok: true, db: result.rows[0].ok === 1 });
  } catch (err: any) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

export default router;
