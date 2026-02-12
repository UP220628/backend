import { Router } from 'express';
import { listProviders, createProvider, deleteProvider } from '../controllers/ProviderController';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', listProviders);
router.post('/', requireAuth, createProvider);
router.delete('/:id', requireAuth, deleteProvider);

export default router;
