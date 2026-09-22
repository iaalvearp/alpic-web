export interface ImageJsonData {
	id: string;
	ownerId: string;
	name: string;
	alt: string;
	description: string;
	src: string;
	storagePath: string | null;
	extension: string;
	mimeType: string;
	sizeBytes: number;
	latitude: number | null;
	longitude: number | null;
	mapsUrl: string | null;
	source: string;
	originalFilename: string;
	createdAt: string;
	updatedAt: string;
	isVisible: boolean;
	deletedAt: string | null;
}

function downloadJson(data: unknown, filename: string): void {
	const json = JSON.stringify(data, null, 2);
	const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
	const url = URL.createObjectURL(blob);

	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	document.body.append(a);
	a.click();
	a.remove();

	window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function isoStamp(): string {
	return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

export function exportImageAsJson(image: ImageJsonData): void {
	downloadJson(image, `alpic-${image.id}.json`);
}

export function exportImagesAsJson(images: ImageJsonData[]): void {
	if (!images.length) return;
	const filename = images.length === 1
		? `alpic-${images[0].id}.json`
		: `alpic-export-${images.length}-${isoStamp()}.json`;
	downloadJson(images, filename);
}