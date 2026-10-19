export const API_URL = "/api/v1";

export class ApiError extends Error {
  statusCode: number;
  errors: unknown[];
  data: unknown;

  constructor(
    statusCode: number,
    message: string,
    errors: unknown[] = [],
    data: unknown = null
  ) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.errors = errors;
    this.data = data;
  }
}

let isRefreshing = false;
let refreshSubscribers: Array<(success: boolean) => void> = [];

function onTokenRefreshed(success: boolean) {
  refreshSubscribers.forEach((callback) => callback(success));
  refreshSubscribers = [];
}

function addRefreshSubscriber(callback: (success: boolean) => void) {
  refreshSubscribers.push(callback);
}

export interface ApiFetchOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

export async function apiFetch<T = unknown>(
  endpoint: string,
  options: ApiFetchOptions = {}
): Promise<T> {
  const { skipAuthRefresh, headers: customHeaders, ...fetchOptions } = options;

  const url = endpoint.startsWith("http")
    ? endpoint
    : endpoint.startsWith(API_URL)
    ? endpoint
    : `${API_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;

  const headers = new Headers(customHeaders);
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (typeof window !== "undefined") {
    const legacyToken = localStorage.getItem("token");
    if (legacyToken && !headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${legacyToken}`);
    }
  }

  const config: RequestInit = {
    ...fetchOptions,
    headers,
    credentials: "include",
  };

  let response: Response;
  try {
    response = await fetch(url, config);
  } catch {
    throw new ApiError(
      0,
      "Unable to connect to the server. Please check your network connection."
    );
  }

  const isAuthEndpoint =
    url.includes("/auth/login") ||
    url.includes("/auth/refresh-token") ||
    url.includes("/auth/logout") ||
    url.includes("/auth/register");

  if (response.status === 401 && !skipAuthRefresh && !isAuthEndpoint) {
    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshRes = await fetch(`${API_URL}/auth/refresh-token`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });

        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newAccessToken =
            refreshData?.accessToken ?? refreshData?.data?.accessToken;
          if (newAccessToken && typeof window !== "undefined") {
            localStorage.setItem("token", newAccessToken);
          }
          onTokenRefreshed(true);
        } else {
          onTokenRefreshed(false);
        }
      } catch {
        onTokenRefreshed(false);
      } finally {
        isRefreshing = false;
      }
    }

    const refreshSucceeded = await new Promise<boolean>((resolve) => {
      addRefreshSubscriber((success) => resolve(success));
    });

    if (refreshSucceeded) {
      return apiFetch<T>(endpoint, { ...options, skipAuthRefresh: true });
    }
  }

  let data: Record<string, unknown> | null = null;
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    try {
      data = (await response.json()) as Record<string, unknown>;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    const rawMessage = data?.message ?? data?.error;
    const message =
      typeof rawMessage === "string" && rawMessage.trim()
        ? rawMessage
        : response.status === 404
        ? "Requested resource was not found"
        : response.status === 403
        ? "You do not have permission to perform this action"
        : response.status === 401
        ? "Session expired or unauthorized. Please sign in."
        : `Request failed with status ${response.status}`;
    const errors = Array.isArray(data?.errors) ? data.errors : [];
    throw new ApiError(response.status, message, errors, data);
  }

  return data as T;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } catch {
    // Ignore network error on logout
  } finally {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      window.location.replace("/");
    }
  }
}

export function getAuthHeaders(): Record<string, string> {
	if (typeof window === "undefined") return {};
	const token = localStorage.getItem("token");
	return token ? { Authorization: `Bearer ${token}` } : {};
}

export function getPersistedId(value: unknown): string | null {
	if (!value || typeof value !== "object") return null;
	const record = value as { _id?: unknown; id?: unknown };
	const id = record._id ?? record.id;
	return typeof id === "string" && id.trim() ? id : null;
}

export function normalizeProject<T extends object>(project: T): (T & {
	id: string;
	role?: string;
	memberCount?: number;
	status?: string;
	startDate?: string;
	endDate?: string;
}) | null {
	if (!project || typeof project !== "object") return null;
	const record = project as T & {
		project?: unknown;
		role?: string;
		memberCount?: number;
		members?: unknown;
		status?: string;
		startDate?: string;
		endDate?: string;
	};
	const source = record.project && typeof record.project === "object"
		? (record.project as Record<string, unknown>)
		: (record as Record<string, unknown>);
	const projectId = getPersistedId(source);
	if (!projectId) return null;

	const rawMembers = source.members ?? record.members;
	const memberCount = typeof source.memberCount === "number"
		? source.memberCount
		: typeof record.memberCount === "number"
			? record.memberCount
			: typeof rawMembers === "number"
				? rawMembers
				: Array.isArray(rawMembers)
					? rawMembers.length
					: 0;

	const role = (record.role ?? source.role) as string | undefined;
	const status = (source.status ?? record.status) as string | undefined;
	const startDate = (source.startDate ?? record.startDate) as string | undefined;
	const endDate = (source.endDate ?? record.endDate) as string | undefined;

	return {
		...source,
		id: projectId,
		role,
		memberCount,
		status,
		startDate,
		endDate,
	} as unknown as (T & {
		id: string;
		role?: string;
		memberCount?: number;
		status?: string;
		startDate?: string;
		endDate?: string;
	});
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
