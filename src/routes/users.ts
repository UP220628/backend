import { Router } from 'express';
import { createUser, listUsers, updateUser, deleteUser } from '../controllers/UserController';
import { requireAuth } from '../middleware/auth';
import { requireRole } from '../middleware/roleGuard';

const router = Router();

// Rutas de usuarios - solo WWS puede gestionar usuarios
router.get('/', requireAuth, requireRole('WWS'), listUsers);
router.post('/', requireAuth, requireRole('WWS'), createUser);
router.put('/:id', requireAuth, requireRole('WWS'), updateUser);
router.delete('/:id', requireAuth, requireRole('WWS'), deleteUser);

export default router;
