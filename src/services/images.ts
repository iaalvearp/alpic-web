import { api } from '../lib/api';

export type ImageRecord = {
	id: string;
	owner_id: string;
	src: string;
	storage_path: string | null;
	name: string | null;
	alt: string | null;
	description: string | null;
	size_bytes: number;
	extension: string;
	mime_type: string;
	latitude: number | null;
	longitude: number | null;
	maps_url: string | null;
	source: string;
	original_filename: string;
	created_at: string;
	updated_at: string;
	is_visible: boolean;
	deleted_at: string | null;
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
		owner_id: img.ownerId,
		src: img.src ?? '',
		storage_path: img.storagePath,
		name: img.name,
		alt: img.alt,
		description: img.description,
		size_bytes: img.sizeBytes,
		extension: img.extension,
		mime_type: img.mimeType,
		latitude: img.latitude,
		longitude: img.longitude,
		maps_url: img.mapsUrl,
		source: img.source,
		original_filename: img.originalFilename,
		created_at: img.createdAt,
		updated_at: img.updatedAt,
		is_visible: img.isVisible,
		deleted_at: img.deletedAt,
	};
}

export async function getVisibleImages(): Promise<ImageRecord[]> {
	const images = await api.get<BackendImage[]>('/api/v1/images');
	return images.map(toImageRecord);
}

export async function deleteImage(id: string): Promise<void> {
	await api.delete(`/api/v1/images/${id}`);
}
