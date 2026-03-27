"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerRepository = exports.ProviderRepository = void 0;
const database_1 = __importDefault(require("../config/database"));
class ProviderRepository {
    async findAll() {
        const rows = await (0, database_1.default) `
			SELECT id, name, code, "createdAt", "updatedAt" FROM "Provider" ORDER BY name
		`;
        return rows;
    }
    async create(name, code) {
        const result = await (0, database_1.default) `
			INSERT INTO "Provider" (name, code, "createdAt", "updatedAt") VALUES (${name}, ${code ?? null}, NOW(), NOW()) RETURNING id, name, code, "createdAt", "updatedAt"
		`;
        return result[0];
    }
    async delete(id) {
        await (0, database_1.default) `DELETE FROM "Provider" WHERE id = ${id}`;
    }
}
exports.ProviderRepository = ProviderRepository;
exports.providerRepository = new ProviderRepository();
//# sourceMappingURL=ProviderRepository.js.map