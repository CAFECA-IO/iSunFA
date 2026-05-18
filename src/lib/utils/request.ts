export class ApiError extends Error {
  public status: number;
  public data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

interface IRequestOptions extends RequestInit {
  query?: Record<string, string | number | boolean | undefined>;
}

export async function request<T = unknown>(
  url: string,
  options: IRequestOptions = {},
): Promise<T> {
  const { query, headers = {}, ...rest } = options;

  let finalUrl = url;
  if (query) {
    const queryString = Object.entries(query)
      .filter(([, value]) => value !== undefined)
      .map(
        ([key, value]) =>
          `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
      )
      .join("&");
    if (queryString) {
      finalUrl += `?${queryString}`;
    }
  }

  const token =
    typeof window !== "undefined" ? localStorage.getItem("dewt") : null;
  const defaultHeaders: Record<string, string> = {
    Authorization: `Bearer ${token}`,
  };

  if (!(options.body instanceof FormData)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    ...rest,
    headers: {
      ...defaultHeaders,
      ...(headers as Record<string, string>),
    },
  };

  try {
    const response = await fetch(finalUrl, config);
    const data = (await response.json().catch(() => ({}))) as unknown;

    if (!response.ok) {
      const errorData = data as { message?: string } | undefined;
      throw new ApiError(
        errorData?.message || response.statusText || "Request failed",
        response.status,
        data,
      );
    }

    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    // Info: (20260118 - Luphia) Network errors or other issues
    throw new ApiError(
      error instanceof Error ? error.message : "Network error",
      0,
    );
  }
}
