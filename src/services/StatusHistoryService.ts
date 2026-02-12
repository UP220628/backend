import { statusHistoryRepository, StatusHistoryFilters } from '../repositories/StatusHistoryRepository';

export class StatusHistoryService {
	async search(filters: StatusHistoryFilters) {
		return statusHistoryRepository.search(filters);
	}
}

export const statusHistoryService = new StatusHistoryService();
