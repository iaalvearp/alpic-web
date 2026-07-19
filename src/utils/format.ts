export function formatFileSize(bytes: number | null): string {
	if (bytes === null || !Number.isFinite(bytes) || bytes < 0) return 'Tamaño no disponible';

	const units = ['B', 'KB', 'MB', 'GB'];
	let value = bytes;
	let unitIndex = 0;
	while (value >= 1024 && unitIndex < units.length - 1) {
		value /= 1024;
		unitIndex += 1;
	}

	const precision = unitIndex === 0 || value >= 10 ? 0 : 1;
	return `${value.toFixed(precision)} ${units[unitIndex]}`;
}

export function formatImageType(extension: string | null, mimeType: string | null): string {
	const cleanExtension = extension?.replace(/^\./, '').trim();
	if (cleanExtension) return cleanExtension.toUpperCase();

	const mimeSubtype = mimeType?.split('/')[1]?.split('+')[0];
	return mimeSubtype ? mimeSubtype.toUpperCase() : 'Formato no disponible';
}

export function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => {
		const entities: Record<string, string> = {
			'&': '&amp;',
			'<': '&lt;',
			'>': '&gt;',
			'"': '&quot;',
			"'": '&#39;',
		};
		return entities[character];
	});
}
