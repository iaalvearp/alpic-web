interface ImageJsonData {
	id: string;
	name: string;
	alt: string;
	description: string;
	src: string;
	extension: string;
	mimeType: string;
	sizeBytes: number;
	latitude: number | null;
	longitude: number | null;
	source: string;
	createdAt: string;
	updatedAt?: string;
}

export function exportImageAsJson(image: ImageJsonData): void {
	const data = {
		id: image.id,
		name: image.name,
		alt: image.alt,
		description: image.description,
		src: image.src,
		extension: image.extension,
		mimeType: image.mimeType,
		sizeBytes: image.sizeBytes,
		latitude: image.latitude,
		longitude: image.longitude,
		source: image.source,
		createdAt: image.createdAt,
		updatedAt: image.updatedAt,
	};

	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = `alpic-${image.id}.json`;
	a.click();

	URL.revokeObjectURL(url);
}
