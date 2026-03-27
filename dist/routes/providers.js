"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ProviderController_1 = require("../controllers/ProviderController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.get('/', ProviderController_1.listProviders);
router.post('/', auth_1.requireAuth, ProviderController_1.createProvider);
router.delete('/:id', auth_1.requireAuth, ProviderController_1.deleteProvider);
exports.default = router;
//# sourceMappingURL=providers.js.map