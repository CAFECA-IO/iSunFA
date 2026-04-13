"use client";

import { fetchApi } from "@/app/admin/setup/_api/common.api";

export async function checkDockerInstalled(): Promise<{ success: boolean; output?: string; error?: string }> {
  return fetchApi("checkDockerInstalled");
}

export async function getSystemHardwareInfo(): Promise<{ osType: string; osRelease: string; arch: string; cpuModel: string; cpuCores: number; totalMemGB: string }> {
  return fetchApi("getSystemHardwareInfo");
}

export async function checkDockerRunning(): Promise<{ success: boolean; output?: string; error?: string }> {
  return fetchApi("checkDockerRunning");
}

export async function getRunningContainers(): Promise<{ success: boolean; output?: string; error?: string }> {
  return fetchApi("getRunningContainers");
}

export async function startDockerEngine(): Promise<{ success: boolean; output?: string; error?: string }> {
  return fetchApi("startDockerEngine");
}

export async function startDockerCompose(): Promise<{ success: boolean; output?: string; error?: string }> {
  return fetchApi("startDockerCompose");
}
