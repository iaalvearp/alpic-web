const SESSION_KEY = 'alpic-session';
const SESSION_EXPIRED_KEY = 'alpic-session-expired';

export interface AuthUser {
	id: string;
	email: string;
	createdAt: string | null;
	role: 'USER' | 'ADMIN';
}

export interface AuthSession {
	token: string;
	user: AuthUser;
}

export interface LoginResponse {
	user: AuthUser;
	accessToken: string;
	tokenType: 'Bearer';
	expiresAt: number | null;
}

export async function login(email: string, password: string): Promise<AuthSession> {
	const response = await fetch(`${import.meta.env.PUBLIC_API_BASE_URL}/api/v1/auth/login`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
	});

	if (!response.ok) {
		let errorBody: { error?: { code: string; message: string } };
		try {
			errorBody = await response.json() as typeof errorBody;
		} catch {
			errorBody = { error: { code: 'NETWORK_ERROR', message: 'No se pudo conectar al servidor' } };
		}
		throw errorBody.error ?? { code: 'UNKNOWN_ERROR', message: 'Error desconocido' };
	}

	const body = await response.json() as { data: LoginResponse };
	const session: AuthSession = {
		token: body.data.accessToken,
		user: body.data.user,
	};
	saveSession(session);
	return session;
}

export async function register(email: string, password: string): Promise<AuthSession> {
	const response = await fetch(`${import.meta.env.PUBLIC_API_BASE_URL}/api/v1/auth/register`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ email, password }),
	});

	if (!response.ok) {
		let errorBody: { error?: { code: string; message: string } };
		try {
			errorBody = await response.json() as typeof errorBody;
		} catch {
			errorBody = { error: { code: 'NETWORK_ERROR', message: 'No se pudo conectar al servidor' } };
		}
		throw errorBody.error ?? { code: 'UNKNOWN_ERROR', message: 'Error desconocido' };
	}

	const body = await response.json() as { data: LoginResponse };
	const session: AuthSession = {
		token: body.data.accessToken,
		user: body.data.user,
	};
	saveSession(session);
	return session;
}

export async function getMe(token: string): Promise<AuthUser> {
	const response = await fetch(`${import.meta.env.PUBLIC_API_BASE_URL}/api/v1/auth/me`, {
		method: 'GET',
		headers: { 'Authorization': `Bearer ${token}` },
	});

	if (!response.ok) {
		throw { code: 'INVALID_TOKEN', message: 'Sesión inválida' };
	}

	const body = await response.json() as { data: AuthUser };
	return body.data;
}

export function saveSession(session: AuthSession): void {
	try {
		localStorage.setItem(SESSION_KEY, JSON.stringify(session));
	} catch {
		// Storage blocked
	}
}

export function loadSession(): AuthSession | null {
	try {
		const raw = localStorage.getItem(SESSION_KEY);
		if (!raw) return null;
		const session = JSON.parse(raw) as AuthSession;
		if (!session?.token) return null;
		return session;
	} catch {
		return null;
	}
}

export function clearSession(): void {
	try {
		localStorage.removeItem(SESSION_KEY);
	} catch {
		// Storage blocked
	}
}

export function markSessionExpired(): void {
	try {
		localStorage.setItem(SESSION_EXPIRED_KEY, '1');
	} catch {
		// Storage blocked
	}
}

export function consumeSessionExpired(): boolean {
	try {
		const value = localStorage.getItem(SESSION_EXPIRED_KEY);
		if (value === '1') {
			localStorage.removeItem(SESSION_EXPIRED_KEY);
			return true;
		}
		return false;
	} catch {
		return false;
	}
}

export function isAuthenticated(): boolean {
	return loadSession() !== null;
}
