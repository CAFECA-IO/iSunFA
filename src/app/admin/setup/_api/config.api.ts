"use client";

import { fetchApi } from "@/app/admin/setup/_api/common.api";
import type { AuthenticationJSON } from "@passwordless-id/webauthn";

export async function finalizeSetupEnvironment(): Promise<{
  success: boolean;
  error?: string;
}> {
  return fetchApi("finalizeSetupEnvironment");
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
  geminiKey: string;
  maptilerKey: string;
  oenToken: string;
  oenMerchant: string;
}): Promise<{ success: boolean; error?: string }> {
  return fetchApi("saveExternalConfig", [config]);
}

export async function getExternalConfig(): Promise<{
  success: boolean;
  data?: {
    appUrl: string;
    gaId: string;
    geminiKey: string;
    maptilerKey: string;
    oenToken: string;
    oenMerchant: string;
  };
  error?: string;
}> {
  return fetchApi("getExternalConfig");
}
