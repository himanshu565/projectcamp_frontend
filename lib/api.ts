export const API_URL = "/api/v1";

export function getPersistedId(value: unknown): string | null {
	if (!value || typeof value !== "object") return null;
	const record = value as { _id?: unknown; id?: unknown };
	const id = record._id ?? record.id;
	return typeof id === "string" && id.trim() ? id : null;
}

export function normalizeProject<T extends object>(project: T): (T & { id: string }) | null {
	const record = project as T & { project?: unknown };
	const source = record.project && typeof record.project === "object"
		? record.project as T
		: project;
	const projectId = getPersistedId(source);
	return projectId ? { ...source, id: projectId } : null;
}

export function unwrapApiData(payload: unknown): Record<string, unknown> | unknown[] {
	if (!payload || typeof payload !== "object") return payload as Record<string, unknown>;
	const response = payload as { data?: unknown };
	if (response.data && typeof response.data === "object") return response.data as Record<string, unknown> | unknown[];
	return payload as Record<string, unknown>;
}

export function getApiCollection<T>(payload: unknown, key: string): T[] {
	const data = unwrapApiData(payload);
	if (Array.isArray(data)) return data as T[];
	const collection = data[key];
	return Array.isArray(collection) ? collection as T[] : [];
}

export function getApiEntity<T>(payload: unknown, key: string): T {
	const data = unwrapApiData(payload);
	if (Array.isArray(data)) return data[0] as T;
	return (data[key] ?? data) as T;
}
