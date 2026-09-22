import { getVisibleImages, deleteImage, type ImageRecord } from '../services/images';
import { clearSession, markSessionExpired } from '../lib/auth';
import { escapeHtml, formatFileSize, formatImageType } from '../utils/format';
import { exportImageAsJson, exportImagesAsJson, type ImageJsonData } from '../utils/export';

const bentoPattern = ['feature', 'portrait', 'square', 'wide', 'square', 'portrait'] as const;
const LONG_PRESS_MS = 1000;

let galleryEl: HTMLElement | null = null;
let statusEl: HTMLElement | null = null;
let imageMap = new Map<string, ImageRecord>();
let selectionBarEl: HTMLElement | null = null;
let selectedIds = new Set<string>();
let longPressTimer: number | null = null;
let longPressTriggered = false;
let longPressOrigin: { x: number; y: number } | null = null;
const LONG_PRESS_MOVE_TOLERANCE = 10;

function textElement(className: string, text: string): HTMLParagraphElement {
	const element = document.createElement('p');
	element.className = className;
	element.textContent = text;
	return element;
}

function imageToJsonData(image: ImageRecord): ImageJsonData {
	return {
		id: image.id,
		ownerId: image.owner_id,
		name: image.name ?? '',
		alt: image.alt ?? '',
		description: image.description ?? '',
		src: image.src,
		storagePath: image.storage_path,
		extension: image.extension,
		mimeType: image.mime_type,
		sizeBytes: image.size_bytes,
		latitude: image.latitude,
		longitude: image.longitude,
		mapsUrl: image.maps_url,
		source: image.source,
		originalFilename: image.original_filename,
		createdAt: image.created_at,
		updatedAt: image.updated_at,
		isVisible: image.is_visible,
		deletedAt: image.deleted_at,
	};
}

function deleteButtonSvg(): string {
	return '<svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>';
}

function removeCard(card: HTMLElement): void {
	const id = card.dataset.imageId;
	if (id) {
		imageMap.delete(id);
		selectedIds.delete(id);
	}
	card.remove();
	updateGalleryState();
}

async function confirmDeleteOne(image: ImageRecord): Promise<void> {
	const name = image.name || 'esta imagen';
	const confirmed = window.confirm(`¿Eliminar "${name}"? Se quitará de tu galería.`);
	if (!confirmed) return;
	try {
		await deleteImage(image.id);
		const card = galleryEl?.querySelector<HTMLElement>(`[data-image-id="${CSS.escape(image.id)}"]`);
		if (card) removeCard(card);
	} catch (error) {
		const apiError = error as { code?: string };
		if (apiError.code === 'UNAUTHORIZED' || apiError.code === 'INVALID_TOKEN') {
			markSessionExpired();
			clearSession();
			window.location.href = '/login';
			return;
		}
		window.alert('No se pudo eliminar la imagen. Inténtalo de nuevo.');
		if (import.meta.env.DEV) console.error('AlPic delete failed', error);
	}
}

function buildCard(image: ImageRecord, index: number, count: number): HTMLElement {
	const card = document.createElement('article');
	card.className = 'gallery-card gallery-card--entering';
	card.dataset.imageId = image.id;
	if (count >= 5) card.classList.add(`gallery-card--${bentoPattern[index % bentoPattern.length]}`);
	card.style.setProperty('--card-delay', `${Math.min(index * 70, 420)}ms`);

	const link = document.createElement('a');
	link.className = 'gallery-link';
	link.href = image.src;
	link.setAttribute('aria-label', `Abrir ${image.name || 'imagen'} en pantalla completa`);
	const captionName = escapeHtml(image.name || 'Imagen de AlPic');
	const captionDescription = image.description ? `<p>${escapeHtml(image.description)}</p>` : '';
	link.dataset.subHtml = `<h4>${captionName}</h4>${captionDescription}`;

	const picture = document.createElement('img');
	picture.src = image.src;
	picture.alt = image.alt ?? '';
	picture.loading = 'lazy';
	picture.decoding = 'async';

	const overlay = document.createElement('div');
	overlay.className = 'gallery-card__overlay';
	overlay.setAttribute('aria-hidden', 'true');
	const content = document.createElement('div');
	content.className = 'gallery-card__content';
	content.append(
		textElement('gallery-card__name', image.name || 'Sin nombre'),
		textElement('gallery-card__description', image.description || 'Sin descripción'),
	);

	const metadata = document.createElement('p');
	metadata.className = 'gallery-card__metadata';
	const size = document.createElement('span');
	size.textContent = formatFileSize(image.size_bytes);
	const dimensions = document.createElement('span');
	dimensions.textContent = 'Dimensiones no disponibles';
	const format = document.createElement('span');
	format.textContent = formatImageType(image.extension, image.mime_type);
	metadata.append(size, dimensions, format);
	content.append(metadata);
	overlay.append(content);
	link.append(picture, overlay);

	const infoButton = document.createElement('button');
	infoButton.className = 'gallery-card__info-button';
	infoButton.type = 'button';
	infoButton.setAttribute('aria-label', `Mostrar información de ${image.name || 'la imagen'}`);
	infoButton.setAttribute('aria-expanded', 'false');
	infoButton.innerHTML = '<span aria-hidden="true">i</span>';
	infoButton.addEventListener('click', () => {
		const open = !card.classList.contains('is-info-open');
		document.querySelectorAll<HTMLElement>('.gallery-card.is-info-open').forEach((openCard) => {
			openCard.classList.remove('is-info-open');
			openCard.querySelector('.gallery-card__info-button')?.setAttribute('aria-expanded', 'false');
		});
		card.classList.toggle('is-info-open', open);
		infoButton.setAttribute('aria-expanded', String(open));
	});

	const setDimensions = (): void => {
		dimensions.textContent = picture.naturalWidth && picture.naturalHeight
			? `${picture.naturalWidth} × ${picture.naturalHeight}`
			: 'Dimensiones no disponibles';
	};
	picture.addEventListener('load', setDimensions, { once: true });
	picture.addEventListener('error', setDimensions, { once: true });
	if (picture.complete) setDimensions();

	const exportButton = document.createElement('button');
	exportButton.className = 'gallery-card__export-button';
	exportButton.type = 'button';
	exportButton.setAttribute('aria-label', `Exportar JSON de ${image.name || 'la imagen'}`);
	exportButton.innerHTML = '<span aria-hidden="true">{}</span>';
	exportButton.addEventListener('click', () => exportImageAsJson(imageToJsonData(image)));

	const deleteBtn = document.createElement('button');
	deleteBtn.className = 'gallery-card__delete-button';
	deleteBtn.type = 'button';
	deleteBtn.setAttribute(
		'aria-label',
		`Eliminar ${image.name || 'la imagen'}`,
	);
	deleteBtn.innerHTML = deleteButtonSvg();
	deleteBtn.addEventListener('click', () => void confirmDeleteOne(image));

	card.append(link, infoButton, exportButton, deleteBtn);

	card.addEventListener('pointerdown', (event) => {
		if (selectedIds.size > 0 || selectionBarEl) return;
		if ((event.target as HTMLElement).closest('button')) return;
		if (longPressTimer !== null) window.clearTimeout(longPressTimer);
		longPressOrigin = { x: event.clientX, y: event.clientY };
		longPressTimer = window.setTimeout(() => {
			longPressTimer = null;
			longPressTriggered = true;
			enterSelectionMode(card);
		}, LONG_PRESS_MS);
	});

	const clearLongPress = (): void => {
		if (longPressTimer !== null) {
			window.clearTimeout(longPressTimer);
			longPressTimer = null;
		}
		longPressOrigin = null;
	};
	card.addEventListener('pointerup', clearLongPress);
	card.addEventListener('pointercancel', clearLongPress);
	card.addEventListener('pointermove', (event) => {
		if (longPressTimer === null || !longPressOrigin) return;
		const moved = Math.hypot(event.clientX - longPressOrigin.x, event.clientY - longPressOrigin.y);
		if (moved > LONG_PRESS_MOVE_TOLERANCE) clearLongPress();
	});

	return card;
}

function buildGalleryClickGuard(gallery: HTMLElement): void {
	gallery.addEventListener('click', (event) => {
		if (!(event.target instanceof Element)) return;
		if (longPressTriggered) {
			longPressTriggered = false;
			event.preventDefault();
			event.stopImmediatePropagation();
			return;
		}
		if (!selectedIds.size) return;
		if (event.target.closest('button')) return;
		const card = event.target.closest<HTMLElement>('.gallery-card');
		if (!card) return;
		event.preventDefault();
		event.stopImmediatePropagation();
		const id = card.dataset.imageId ?? '';
		if (selectedIds.has(id)) {
			selectedIds.delete(id);
			card.classList.remove('is-selected');
			card.removeAttribute('aria-pressed');
		} else {
			selectedIds.add(id);
			card.classList.add('is-selected');
			card.setAttribute('aria-pressed', 'true');
		}
		updateSelectionBar();
		if (selectedIds.size === 0) exitSelectionMode();
	}, true);
}

function renderState(gallery: HTMLElement, type: 'empty' | 'error'): void {
	const state = document.createElement('div');
	state.className = `gallery-state gallery-state--${type}`;
	state.append(
		textElement(
			'gallery-state__title',
			type === 'empty' ? 'Aún no tienes imágenes' : 'No pudimos cargar tu galería',
		),
		textElement(
			'gallery-state__message',
			type === 'empty'
				? 'Sube tu primera foto desde la app móvil o desde aquí.'
				: 'Revisa tu conexión e inténtalo de nuevo.',
		),
	);

	if (type === 'error') {
		const retryBtn = document.createElement('button');
		retryBtn.type = 'button';
		retryBtn.className = 'auth-submit gallery-state__retry';
		retryBtn.textContent = 'Reintentar';
		retryBtn.addEventListener('click', () => void initGallery());
		state.append(retryBtn);
	}

	gallery.replaceChildren(state);
}

function buildSelectionBar(): HTMLElement {
	const bar = document.createElement('div');
	bar.className = 'selection-bar';
	bar.setAttribute('role', 'toolbar');
	bar.setAttribute('aria-label', 'Acciones de selección');

	const label = document.createElement('span');
	label.className = 'selection-bar__label';
	label.id = 'selection-count';

	const exportBtn = document.createElement('button');
	exportBtn.type = 'button';
	exportBtn.className = 'selection-bar__button selection-bar__button--export';
	exportBtn.textContent = 'Exportar';
	exportBtn.setAttribute('aria-label', 'Exportar JSON de las imágenes seleccionadas');
	exportBtn.addEventListener('click', () => {
		const selected = [...selectedIds].map((id) => imageMap.get(id)).filter(Boolean) as ImageRecord[];
		exportImagesAsJson(selected.map(imageToJsonData));
	});

	const deleteBtn = document.createElement('button');
	deleteBtn.type = 'button';
	deleteBtn.className = 'selection-bar__button selection-bar__button--delete';
	deleteBtn.textContent = 'Eliminar';
	deleteBtn.setAttribute('aria-label', 'Eliminar las imágenes seleccionadas');
	deleteBtn.addEventListener('click', () => void confirmDeleteMany());

	const cancelBtn = document.createElement('button');
	cancelBtn.type = 'button';
	cancelBtn.className = 'selection-bar__button selection-bar__button--cancel';
	cancelBtn.textContent = 'Cancelar';
	cancelBtn.setAttribute('aria-label', 'Salir del modo de selección');
	cancelBtn.addEventListener('click', exitSelectionMode);

	bar.append(label, exportBtn, deleteBtn, cancelBtn);
	return bar;
}

function updateSelectionBar(): void {
	if (!selectionBarEl) return;
	const label = selectionBarEl.querySelector('#selection-count');
	if (label) {
		label.textContent = `${selectedIds.size} ${selectedIds.size === 1 ? 'imagen' : 'imágenes'} seleccionada${selectedIds.size === 1 ? '' : 's'}`;
	}
}

function enterSelectionMode(card: HTMLElement): void {
	if (!galleryEl || selectionBarEl) return;
	selectedIds.clear();
	galleryEl.classList.add('is-selecting');
	selectionBarEl = buildSelectionBar();
	document.body.append(selectionBarEl);
	selectionBarEl.classList.add('is-visible');
	toggleSelect(card.dataset.imageId ?? '', card);
	updateSelectionBar();
}

function exitSelectionMode(): void {
	selectedIds.clear();
	if (galleryEl) galleryEl.classList.remove('is-selecting');
	galleryEl?.querySelectorAll<HTMLElement>('.gallery-card.is-selected').forEach((card) => {
		card.classList.remove('is-selected');
		card.removeAttribute('aria-pressed');
	});
	selectionBarEl?.remove();
	selectionBarEl = null;
	updateGalleryState();
}

function toggleSelect(id: string, card: HTMLElement): void {
	if (!id) return;
	if (selectedIds.has(id)) {
		selectedIds.delete(id);
		card.classList.remove('is-selected');
		card.removeAttribute('aria-pressed');
	} else {
		selectedIds.add(id);
		card.classList.add('is-selected');
		card.setAttribute('aria-pressed', 'true');
	}
	updateSelectionBar();
	if (selectedIds.size === 0) exitSelectionMode();
}

async function confirmDeleteMany(): Promise<void> {
	if (!selectedIds.size) return;
	const count = selectedIds.size;
	const confirmed = window.confirm(
		`¿Eliminar ${count} ${count === 1 ? 'imagen' : 'imágenes'}? Se quitarán de tu galería.`,
	);
	if (!confirmed) return;

	const ids = [...selectedIds];
	let failed = 0;
	for (const id of ids) {
		try {
			await deleteImage(id);
			imageMap.delete(id);
		} catch (error) {
			const apiError = error as { code?: string };
			if (apiError.code === 'UNAUTHORIZED' || apiError.code === 'INVALID_TOKEN') {
				markSessionExpired();
				clearSession();
				window.location.href = '/login';
				return;
			}
			failed += 1;
			if (import.meta.env.DEV) console.error('AlPic batch delete failed for', id, error);
		}
	}

	ids.forEach((id) => {
		const card = galleryEl?.querySelector<HTMLElement>(`[data-image-id="${CSS.escape(id)}"]`);
		card?.remove();
	});

	selectedIds.clear();
	exitSelectionMode();

	if (failed) {
		window.alert(`${failed} ${failed === 1 ? 'imagen no pudo' : 'imágenes no pudieron'} eliminarse.`);
	}
}

function updateGalleryState(): void {
	if (!galleryEl || !statusEl) return;
	if (imageMap.size === 0) {
		galleryEl.dataset.state = 'empty';
		galleryEl.dataset.count = '0';
		renderState(galleryEl, 'empty');
		statusEl.textContent = 'Sin imágenes';
		return;
	}
	galleryEl.dataset.count = String(imageMap.size);
	statusEl.textContent = `${imageMap.size} ${imageMap.size === 1 ? 'imagen' : 'imágenes'}`;
}

document.addEventListener('keydown', (event) => {
	if (event.key === 'Escape' && selectedIds.size) exitSelectionMode();
});

async function initLightGallery(gallery: HTMLElement): Promise<void> {
	const [{ default: lightGallery }, { default: lgZoom }] = await Promise.all([
		import('lightgallery'),
		import('lightgallery/plugins/zoom'),
	]);
	lightGallery(gallery, {
		selector: '.gallery-link',
		plugins: [lgZoom],
		speed: 320,
		download: false,
		counter: true,
		controls: true,
		closable: true,
		keyPress: true,
		enableDrag: true,
		enableSwipe: true,
		hideScrollbar: true,
		licenseKey: '0000-0000-000-0000',
	});
}

export async function initGallery(): Promise<void> {
	const gallery = document.querySelector<HTMLElement>('#gallery');
	const status = document.querySelector<HTMLElement>('#gallery-status');
	if (!gallery) return;
	galleryEl = gallery;
	statusEl = status;
	selectedIds.clear();

	gallery.dataset.state = 'loading';
	gallery.setAttribute('aria-busy', 'true');
	if (status) status.textContent = 'Cargando tus imágenes…';

	try {
		const images = await getVisibleImages();
		gallery.dataset.count = String(images.length);
		if (!images.length) {
			gallery.dataset.state = 'empty';
			renderState(gallery, 'empty');
			if (status) status.textContent = 'Sin imágenes';
			return;
		}

		imageMap = new Map(images.map((image) => [image.id, image] as const));
		const cards = images.map((image, index) => buildCard(image, index, images.length));
		gallery.dataset.state = 'ready';
		gallery.replaceChildren(...cards);
		buildGalleryClickGuard(gallery);
		requestAnimationFrame(() => {
			requestAnimationFrame(() => {
				cards.forEach((card) => {
					const finishEntrance = (event: TransitionEvent): void => {
						if (event.propertyName !== 'transform') return;
						card.classList.remove('gallery-card--entering');
						card.style.removeProperty('--card-delay');
						card.removeEventListener('transitionend', finishEntrance);
					};
					card.addEventListener('transitionend', finishEntrance);
					card.classList.add('is-visible');
					window.setTimeout(() => {
						card.classList.remove('gallery-card--entering');
						card.style.removeProperty('--card-delay');
						card.removeEventListener('transitionend', finishEntrance);
					}, 1100);
				});
			});
		});
		if (status) status.textContent = `${images.length} ${images.length === 1 ? 'imagen' : 'imágenes'}`;
		try {
			await initLightGallery(gallery);
		} catch (error) {
			if (import.meta.env.DEV) console.error('[AlPic] LightGallery initialization failed', error);
		}
	} catch (error: unknown) {
		const apiError = error as { code?: string };
		if (apiError.code === 'UNAUTHORIZED' || apiError.code === 'INVALID_TOKEN') {
			markSessionExpired();
			clearSession();
			window.location.href = '/login';
			return;
		}
		gallery.dataset.state = 'error';
		gallery.dataset.count = '0';
		renderState(gallery, 'error');
		if (status) status.textContent = 'Error de conexión';
		if (import.meta.env.DEV) console.error('AlPic gallery initialization failed', error);
	} finally {
		gallery.setAttribute('aria-busy', 'false');
	}
}