import { getSupabaseClient } from '../lib/supabase';

export type ImageRecord = {
	src: string;
	name: string | null;
	alt: string | null;
	description: string | null;
	size_bytes: number | null;
	extension: string | null;
	mime_type: string | null;
	created_at: string;
};

const IMAGE_FIELDS =
	'src,name,alt,description,size_bytes,extension,mime_type,created_at' as const;

export async function getVisibleImages(): Promise<ImageRecord[]> {
	const { data, error } = await getSupabaseClient()
		.schema('public')
		.from('images')
		.select(IMAGE_FIELDS)
		.eq('is_visible', true)
		.order('created_at', { ascending: false });

	if (error) throw new Error(error.message);
	return data ?? [];
}
