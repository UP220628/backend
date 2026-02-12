import { providerRepository } from '../repositories/ProviderRepository';

export class ProviderService {
	async listProviders(): Promise<any[]> {
		return providerRepository.findAll();
	}

	async createProvider(data: { name?: string; code?: string }): Promise<any> {
		const { name, code } = data;
		
		if (!name) {
			throw new Error('Missing provider name');
		}

		return providerRepository.create(name, code);
	}

	async deleteProvider(id: number): Promise<void> {
		if (!id) {
			throw new Error('Missing provider id');
		}
		return providerRepository.delete(id);
	}
}

export const providerService = new ProviderService();
