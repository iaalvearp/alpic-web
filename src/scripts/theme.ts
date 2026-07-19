type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'alpic-theme';
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)');
const labels: Record<ThemePreference, string> = {
	system: 'Tema del sistema',
	light: 'Tema claro',
	dark: 'Tema oscuro',
};

function isThemePreference(value: string | null | undefined): value is ThemePreference {
	return value === 'system' || value === 'light' || value === 'dark';
}

function resolveTheme(preference: ThemePreference): 'light' | 'dark' {
	return preference === 'system' ? (systemTheme.matches ? 'dark' : 'light') : preference;
}

function applyTheme(preference: ThemePreference): void {
	const resolved = resolveTheme(preference);
	document.documentElement.dataset.theme = resolved;
	document.documentElement.dataset.themePreference = preference;
	document.documentElement.style.colorScheme = resolved;

	const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
	if (toggle) {
		toggle.title = labels[preference];
		toggle.setAttribute('aria-label', `Abrir opciones de tema. ${labels[preference]} seleccionado`);
	}

	document.querySelectorAll<HTMLButtonElement>('[data-theme-option]').forEach((option) => {
		option.setAttribute('aria-pressed', String(option.dataset.themeOption === preference));
	});
}

export function initTheme(): void {
	let storedTheme: string | null = null;
	try {
		storedTheme = localStorage.getItem(STORAGE_KEY);
	} catch {
		// The system preference remains available when storage is blocked.
	}

	const preference: ThemePreference = isThemePreference(storedTheme) ? storedTheme : 'system';
	const menu = document.querySelector<HTMLElement>('#theme-menu');
	const toggle = document.querySelector<HTMLButtonElement>('#theme-toggle');
	const options = document.querySelectorAll<HTMLButtonElement>('[data-theme-option]');

	const setMenuOpen = (open: boolean): void => {
		if (!menu || !toggle) return;
		menu.classList.toggle('is-open', open);
		toggle.setAttribute('aria-expanded', String(open));
		const selected = document.documentElement.dataset.themePreference;
		const currentLabel = isThemePreference(selected) ? labels[selected] : labels.system;
		toggle.setAttribute(
			'aria-label',
			`${open ? 'Cerrar' : 'Abrir'} opciones de tema. ${currentLabel} seleccionado`,
		);
		options.forEach((option) => (option.tabIndex = open ? 0 : -1));
	};

	applyTheme(preference);
	toggle?.addEventListener('click', () => setMenuOpen(!menu?.classList.contains('is-open')));
	options.forEach((option) => {
		option.addEventListener('click', () => {
			const selected = option.dataset.themeOption;
			if (!isThemePreference(selected)) return;
			try {
				localStorage.setItem(STORAGE_KEY, selected);
			} catch {
				// Apply the selection for this session even when storage is blocked.
			}
			applyTheme(selected);
			setMenuOpen(false);
			toggle?.focus();
		});
	});

	document.addEventListener('pointerdown', (event) => {
		if (menu?.classList.contains('is-open') && !menu.contains(event.target as Node)) {
			setMenuOpen(false);
		}
	});
	document.addEventListener('keydown', (event) => {
		if (event.key === 'Escape' && menu?.classList.contains('is-open')) {
			setMenuOpen(false);
			toggle?.focus();
		}
	});
	systemTheme.addEventListener('change', () => {
		if (document.documentElement.dataset.themePreference === 'system') applyTheme('system');
	});
}
