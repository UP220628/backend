"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const UserController_1 = require("../controllers/UserController");
const auth_1 = require("../middleware/auth");
const roleGuard_1 = require("../middleware/roleGuard");
const router = (0, express_1.Router)();
// Rutas de usuarios - solo WWS puede gestionar usuarios
router.get('/', auth_1.requireAuth, (0, roleGuard_1.requireRole)('WWS'), UserController_1.listUsers);
router.post('/', auth_1.requireAuth, (0, roleGuard_1.requireRole)('WWS'), UserController_1.createUser);
router.put('/:id', auth_1.requireAuth, (0, roleGuard_1.requireRole)('WWS'), UserController_1.updateUser);
router.delete('/:id', auth_1.requireAuth, (0, roleGuard_1.requireRole)('WWS'), UserController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=users.js.map