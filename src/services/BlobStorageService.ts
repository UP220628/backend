export class BlobStorageService {
	private normalizeUrls(urls: string[]): string[] {
		const unique = new Set<string>();

		for (const url of urls) {
			if (typeof url !== 'string') continue;
			const trimmed = url.trim();
			if (!trimmed) continue;
			if (!this.isVercelBlobUrl(trimmed)) continue;
			unique.add(trimmed);
		}

		return Array.from(unique);
	}

	private isVercelBlobUrl(url: string): boolean {
		try {
			const parsed = new URL(url);
			return parsed.hostname.endsWith('.blob.vercel-storage.com');
		} catch {
			return false;
		}
	}

	async deleteUrls(urls: string[]): Promise<void> {
		const normalizedUrls = this.normalizeUrls(urls);
		if (normalizedUrls.length === 0) {
			return;
		}

		const token = process.env.BLOB_READ_WRITE_TOKEN;
		if (!token) {
			throw new Error('BLOB_READ_WRITE_TOKEN is required to delete defect photos');
		}

		try {
			const { del } = await import('@vercel/blob');
			await del(normalizedUrls, { token });
		} catch {
			throw new Error('Failed to delete defect photo(s) from Vercel Blob storage');
		}
	}
}

export const blobStorageService = new BlobStorageService();
