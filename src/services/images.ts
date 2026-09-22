import { api } from '../lib/api';

export type ImageRecord = {
	id: string;
	src: string;
	name: string | null;
	alt: string | null;
	description: string | null;
	size_bytes: number;
	extension: string;
	mime_type: string;
	created_at: string;
};

interface BackendImage {
	id: string;
	ownerId: string;
	name: string;
	src: string | null;
	storagePath: string | null;
	alt: string;
	description: string;
	mimeType: string;
	extension: string;
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

function toImageRecord(img: BackendImage): ImageRecord {
	return {
		id: img.id,
		src: img.src ?? '',
		name: img.name,
		alt: img.alt,
		description: img.description,
		size_bytes: img.sizeBytes,
		extension: img.extension,
		mime_type: img.mimeType,
		created_at: img.createdAt,
	};
}

export async function getVisibleImages(): Promise<ImageRecord[]> {
	const images = await api.get<BackendImage[]>('/api/v1/images');
	return images.map(toImageRecord);
}
