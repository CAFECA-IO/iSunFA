"use client";

import { fetchApi } from "@/app/admin/setup/_api/common.api";

export async function initDb(): Promise<{
  success: boolean;
  output?: string;
  error?: string;
}> {
  return fetchApi("initDb");
}

export async function getDatabaseStatus(): Promise<{
  success: boolean;
  tableCount: number;
  dbPassword?: string;
  dbHost?: string;
  dbPort?: string;
  error?: string;
}> {
  return fetchApi("getDatabaseStatus");
}

export async function setDbPassword(
  newPassword: string,
): Promise<{ success: boolean; output?: string; error?: string }> {
  return fetchApi("setDbPassword", [newPassword]);
}
