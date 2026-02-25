import { Router } from 'express';
import { getWeeklyUnitsByProvider, getMonthlyUnitsTimeline, getDefectsByModel, getDefectsByType } from '../controllers/DashboardController';

const router = Router();

router.get('/weekly-by-provider', getWeeklyUnitsByProvider);
router.get('/monthly-timeline', getMonthlyUnitsTimeline);
router.get('/defects-by-model', getDefectsByModel);
router.get('/defects-by-type', getDefectsByType);

export default router;
