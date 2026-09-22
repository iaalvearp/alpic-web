import { loadSession } from './auth';

const BASE_URL = import.meta.env.PUBLIC_API_BASE_URL as string;

export interface ApiError {
	code: string;
	message: string;
}

export interface ApiResponse<T> {
	data: T;
}

export interface ApiErrorResponse {
	error: ApiError;
}

class ApiClient {
	private getHeaders(isMultipart = false): Record<string, string> {
		const headers: Record<string, string> = {};

		if (!isMultipart) {
			headers['Content-Type'] = 'application/json';
		}

		const session = loadSession();
		if (session?.token) {
			headers['Authorization'] = `Bearer ${session.token}`;
		}

		return headers;
	}

	private async handleResponse<T>(response: Response): Promise<T> {
		if (!response.ok) {
			let errorBody: ApiErrorResponse;
			try {
				errorBody = await response.json() as ApiErrorResponse;
			} catch {
				errorBody = {
					error: {
						code: 'UNKNOWN_ERROR',
						message: `Error ${response.status}: ${response.statusText}`,
					},
				};
			}
			throw errorBody.error;
		}

		const body = await response.json() as ApiResponse<T>;
		return body.data;
	}

	async get<T>(path: string): Promise<T> {
		const response = await fetch(`${BASE_URL}${path}`, {
			method: 'GET',
			headers: this.getHeaders(),
		});
		return this.handleResponse<T>(response);
	}

	async post<T>(path: string, body?: unknown): Promise<T> {
		const response = await fetch(`${BASE_URL}${path}`, {
			method: 'POST',
			headers: this.getHeaders(),
			body: body ? JSON.stringify(body) : undefined,
		});
		return this.handleResponse<T>(response);
	}

	async put<T>(path: string, body?: unknown): Promise<T> {
		const response = await fetch(`${BASE_URL}${path}`, {
			method: 'PUT',
			headers: this.getHeaders(),
			body: body ? JSON.stringify(body) : undefined,
		});
		return this.handleResponse<T>(response);
	}

	async delete<T>(path: string): Promise<T> {
		const response = await fetch(`${BASE_URL}${path}`, {
			method: 'DELETE',
			headers: this.getHeaders(),
		});
		return this.handleResponse<T>(response);
	}

	async upload<T>(path: string, formData: FormData): Promise<T> {
		const response = await fetch(`${BASE_URL}${path}`, {
			method: 'POST',
			headers: this.getHeaders(true),
			body: formData,
		});
		return this.handleResponse<T>(response);
	}
}

export const api = new ApiClient();
