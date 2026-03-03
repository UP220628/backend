import { Router } from 'express';
import { createUnit, listUnits, updateUnitStatus, updateUnitPriority, updatePriorityOrder, addDefectToUnit, updateDefectGrade, getDefectStats, getTodayUnits, setScmDecision, getStatusStats, updateEstimatedRepairTime, getUnitsInRepair, getUnitById, archiveUnit, getArchivableUnits } from '../controllers/UnitController';
import { validateOverridePermission } from '../middleware/roleGuard';
import { requireAuth } from '../middleware/auth';

const router = Router();

router.get('/', listUnits);
router.get('/stats/defects', getDefectStats);
router.get('/stats/by-status', getStatusStats);
router.get('/in-repair', getUnitsInRepair);
router.get('/today', requireAuth, getTodayUnits);
router.get('/archivable', requireAuth, getArchivableUnits);
router.get('/:id', requireAuth, getUnitById);
router.post('/', createUnit);
router.put('/:id/status', updateUnitStatus);
router.put('/:id/priority', updateUnitPriority);
router.put('/:id/estimated-time', updateEstimatedRepairTime);
router.put('/:id/scm-decision', setScmDecision);
router.put('/:id/archive', archiveUnit);
router.post('/:id/defects', validateOverridePermission, addDefectToUnit);
router.put('/:id/defects/:defectId', updateDefectGrade);
router.put('/priority/order', updatePriorityOrder);

export default router;
