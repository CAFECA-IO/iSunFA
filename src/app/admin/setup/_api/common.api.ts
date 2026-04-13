"use client";

import { fetchWithRetry } from "@/lib/utils/http_client";
import type { IApiResponse } from "@/lib/utils/response";

// Info: (20260413 - Luphia) Universal API executer
export async function fetchApi<T>(action: string, args: unknown[] = []): Promise<T> {
  const res = await fetchWithRetry(`/api/v1/admin/setup/${action}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ args }),
  });

  const data = await res.json() as IApiResponse<T>;

  if (!data.success) {
    return { success: false, error: data.message } as unknown as T;
  }

  return data.payload as T;
}
