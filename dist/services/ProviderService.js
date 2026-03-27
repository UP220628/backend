"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.providerService = exports.ProviderService = void 0;
const ProviderRepository_1 = require("../repositories/ProviderRepository");
class ProviderService {
    async listProviders() {
        return ProviderRepository_1.providerRepository.findAll();
    }
    async createProvider(data) {
        const { name, code } = data;
        if (!name) {
            throw new Error('Missing provider name');
        }
        return ProviderRepository_1.providerRepository.create(name, code);
    }
    async deleteProvider(id) {
        if (!id) {
            throw new Error('Missing provider id');
        }
        return ProviderRepository_1.providerRepository.delete(id);
    }
}
exports.ProviderService = ProviderService;
exports.providerService = new ProviderService();
//# sourceMappingURL=ProviderService.js.map