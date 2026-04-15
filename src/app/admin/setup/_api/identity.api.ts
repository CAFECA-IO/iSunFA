"use client";

import { fetchApi } from "@/app/admin/setup/_api/common.api";

export async function checkSuperAdminExists(): Promise<{
  exists: boolean;
  address?: string;
  needsAuth?: boolean;
  credId?: string;
}> {
  return fetchApi("checkSuperAdminExists");
}

export async function authorizeSuperAdmin(authentication?: unknown): Promise<{
  success: boolean;
  address?: string;
  error?: string;
  pendingTask?: boolean;
}> {
  return fetchApi("authorizeSuperAdmin", [authentication]);
}

export async function createSuperAdminRecord(
  credentialId: string,
  pubKeyX: string,
  pubKeyY: string,
  name: string = "ISUNFA SUPER ADMIN",
): Promise<{
  success: boolean;
  address?: string;
  error?: string;
  pendingTask?: boolean;
}> {
  return fetchApi("createSuperAdminRecord", [
    credentialId,
    pubKeyX,
    pubKeyY,
    name,
  ]);
}

export async function getSuperAdminTaskStatus(): Promise<{
  done: boolean;
  error: string | null;
  progress: string;
}> {
  return fetchApi("getSuperAdminTaskStatus");
}

export async function getAdminList(): Promise<{
  success: boolean;
  data?: {
    address: string;
    name: string | null;
    role: string;
    createdAt: Date;
  }[];
  error?: string;
}> {
  return fetchApi("getAdminList");
}

export async function deleteAdminRecord(address: string): Promise<{
  success: boolean;
  error?: string;
}> {
  return fetchApi("deleteAdminRecord", [address]);
}

export async function createAdminRecord(
  credentialId: string,
  pubKeyX: string,
  pubKeyY: string,
  name: string = "SERVER ADMIN",
): Promise<{ success: boolean; address?: string; error?: string }> {
  return fetchApi("createAdminRecord", [credentialId, pubKeyX, pubKeyY, name]);
}

export async function replaceAdminRecord(
  adminAddr: string,
  credentialId: string,
  pubKeyX: string,
  pubKeyY: string,
): Promise<{ success: boolean; error?: string }> {
  return fetchApi("replaceAdminRecord", [
    adminAddr,
    credentialId,
    pubKeyX,
    pubKeyY,
  ]);
}

export async function clearSuperAdminConfig(): Promise<{
  success: boolean;
  error?: string;
}> {
  return fetchApi("clearSuperAdminConfig");
}
