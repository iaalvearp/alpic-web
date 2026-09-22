import { getVisibleImages, type ImageRecord } from '../services/images';
import { clearSession, markSessionExpired } from '../lib/auth';
import { escapeHtml, formatFileSize, formatImageType } from '../utils/format';
import { exportImageAsJson } from '../utils/export';

const bentoPattern = ['feature', 'portrait', 'square', 'wide', 'square', 'portrait'] as const;

function textElement(className: string, text: string): HTMLParagraphElement {
	const element = document.createElement('p');
	element.className = className;
	element.textContent = text;
	return element;
}

function buildCard(image: ImageRecord, index: number, count: number): HTMLElement {
	const card = document.createElement('article');
	card.className = 'gallery-card gallery-card--entering';
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
	exportButton.addEventListener('click', () => {
		exportImageAsJson({
			id: image.id,
			name: image.name ?? '',
			alt: image.alt ?? '',
			description: image.description ?? '',
			src: image.src,
			extension: image.extension,
			mimeType: image.mime_type,
			sizeBytes: image.size_bytes,
			latitude: null,
			longitude: null,
			source: 'gallery',
			createdAt: image.created_at,
		});
	});

	card.append(link, infoButton, exportButton);
	return card;
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

		const cards = images.map((image, index) => buildCard(image, index, images.length));
		gallery.dataset.state = 'ready';
		gallery.replaceChildren(...cards);
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
