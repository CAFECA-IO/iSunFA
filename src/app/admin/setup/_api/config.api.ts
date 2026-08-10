"use client";

import { fetchApi } from "@/app/admin/setup/_api/common.api";
import type { AuthenticationJSON } from "@passwordless-id/webauthn";

export async function finalizeSetupEnvironment(): Promise<{
  success: boolean;
  error?: string;
}> {
  return fetchApi("finalizeSetupEnvironment");
}

/**
 * Info: (20260809 - Luphia) 確保保險庫主密鑰存在，必須在計算任何簽章 digest 之前呼叫，
 * 新產生的金鑰才會被納入這次的簽署範圍。
 */
export async function ensureSecretVaultKey(): Promise<{
  success: boolean;
  generated: boolean;
  error?: string;
}> {
  return fetchApi("ensureSecretVaultKey");
}

export async function getEnvHashChallenge(): Promise<{
  success: boolean;
  challenge?: string;
  error?: string;
}> {
  return fetchApi("getEnvHashChallenge");
}

export async function getEnvSignatureStatus(): Promise<{
  success: boolean;
  status?:
    | "COMPLETE"
    | "MISSING_FILES"
    | "MISSING_KEYS"
    | "SIGNATURE_MISMATCH"
    | "UNKNOWN_ERROR";
  error?: string;
  missingKeys?: string[];
  envData?: Record<string, string>;
}> {
  return fetchApi("getEnvSignatureStatus");
}

export async function getEnvContentToSign(): Promise<{
  success: boolean;
  items?: { key: string; value: string }[];
  error?: string;
}> {
  return fetchApi("getEnvContentToSign");
}

export async function apiRestartService(): Promise<{
  success: boolean;
  error?: string;
}> {
  return fetchApi("restartService");
}

export async function verifyAndFinalizeConfig(
  authData: AuthenticationJSON,
): Promise<{ success: boolean; error?: string }> {
  return fetchApi("verifyAndFinalizeConfig", [authData]);
}

export async function isSystemSetupComplete(): Promise<boolean> {
  return fetchApi("isSystemSetupComplete");
}

export async function saveExternalConfig(config: {
  appUrl: string;
  gaId: string;
  maptilerKey: string;
}): Promise<{ success: boolean; error?: string }> {
  return fetchApi("saveExternalConfig", [config]);
}

/**
 * Info: (20260809 - Luphia) 由資料庫保管的系統設定（第三方登入、LLM 金鑰、金流憑證）。
 * 這些值最終寫入 system_setting 表並經 SUPER_ADMIN 簽章，精靈只是暫存到簽章步驟為止。
 */
export async function saveSystemSettingDraft(
  values: Record<string, string>,
): Promise<{ success: boolean; error?: string }> {
  return fetchApi("saveSystemSettingDraft", [values]);
}

export async function getSystemSettingDraft(): Promise<{
  success: boolean;
  data?: Record<string, string>;
  error?: string;
}> {
  return fetchApi("getSystemSettingDraft");
}

export async function hasPendingSystemSettings(): Promise<{
  success: boolean;
  pending: boolean;
}> {
  return fetchApi("hasPendingSystemSettings");
}

export async function getSystemSettingChallenge(): Promise<{
  success: boolean;
  challenge?: string;
  version?: number;
  items?: { key: string; value: string; isSecret: boolean }[];
  error?: string;
}> {
  return fetchApi("getSystemSettingChallenge");
}

export async function applySystemSettingSignature(
  authData: AuthenticationJSON,
): Promise<{ success: boolean; version?: number; error?: string }> {
  return fetchApi("applySystemSettingSignature", [authData]);
}

export async function getExternalConfig(): Promise<{
  success: boolean;
  data?: {
    appUrl: string;
    gaId: string;
    maptilerKey: string;
  };
  error?: string;
}> {
  return fetchApi("getExternalConfig");
}
