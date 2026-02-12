import { Router } from 'express';
import { getLogs, exportLogsToExcel } from '../controllers/StatusHistoryController';

const router = Router();

router.get('/', getLogs);
router.get('/export', exportLogsToExcel);

export default router;
