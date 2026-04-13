"use client";

import { fetchApi } from "@/app/admin/setup/_api/common.api";
import type { AuthenticationJSON } from "@passwordless-id/webauthn";

export async function finalizeSetupEnvironment(): Promise<{ success: boolean; error?: string }> {
  return fetchApi("finalizeSetupEnvironment");
}

export async function getEnvHashChallenge(): Promise<{ success: boolean; challenge?: string; error?: string }> {
  return fetchApi("getEnvHashChallenge");
}

export async function verifyAndFinalizeConfig(authData: AuthenticationJSON): Promise<{ success: boolean; error?: string }> {
  return fetchApi("verifyAndFinalizeConfig", [authData]);
}

export async function isSystemSetupComplete(): Promise<boolean> {
  return fetchApi("isSystemSetupComplete");
}

export async function saveExternalConfig(config: { appUrl: string; gaId: string; geminiKey: string; oenToken: string; oenMerchant: string }): Promise<{ success: boolean; error?: string }> {
  return fetchApi("saveExternalConfig", [config]);
}

export async function getExternalConfig(): Promise<{ success: boolean; data?: { appUrl: string; gaId: string; geminiKey: string; oenToken: string; oenMerchant: string }; error?: string }> {
  return fetchApi("getExternalConfig");
}
