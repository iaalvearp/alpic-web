import { initTheme } from './theme';

let hasStarted = false;

async function start(): Promise<void> {
	if (hasStarted) return;
	hasStarted = true;

	if (import.meta.env.DEV) {
		console.debug('[AlPic]', {
			clientStarted: true,
			globalStylesLoaded:
				getComputedStyle(document.documentElement).getPropertyValue('--alpic-global-styles-loaded').trim() === '1',
			reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
			hover: window.matchMedia('(hover: hover)').matches,
			pointerFine: window.matchMedia('(pointer: fine)').matches,
			anyHover: window.matchMedia('(any-hover: hover)').matches,
			anyPointerFine: window.matchMedia('(any-pointer: fine)').matches,
		});
	}

	try {
		initTheme();
	} catch (error) {
		if (import.meta.env.DEV) console.error('[AlPic] Theme initialization failed', error);
	}

	try {
		const { initGallery } = await import('./gallery');
		await initGallery();
	} catch (error) {
		if (import.meta.env.DEV) console.error('[AlPic] Gallery initialization failed', error);
	}
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => void start(), { once: true });
} else {
	void start();
}
