import { Router } from 'express';
import { getWeeklyUnitsByProvider, getMonthlyUnitsTimeline } from '../controllers/DashboardController';

const router = Router();

router.get('/weekly-by-provider', getWeeklyUnitsByProvider);
router.get('/monthly-timeline', getMonthlyUnitsTimeline);

export default router;
