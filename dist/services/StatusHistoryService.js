"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusHistoryService = exports.StatusHistoryService = void 0;
const StatusHistoryRepository_1 = require("../repositories/StatusHistoryRepository");
class StatusHistoryService {
    async search(filters) {
        return StatusHistoryRepository_1.statusHistoryRepository.search(filters);
    }
}
exports.StatusHistoryService = StatusHistoryService;
exports.statusHistoryService = new StatusHistoryService();
//# sourceMappingURL=StatusHistoryService.js.map