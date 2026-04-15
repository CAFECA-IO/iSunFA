import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import * as SetupService from "@/services/setup.service";
import { validateEnv } from "@/validators/env";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;

    // Info: (20260413 - Luphia) 1. Validate if the action exists in our service
    if (!(action in SetupService)) {
      return jsonFail(ApiCode.NOT_FOUND, `Action '${action}' not found`);
    }

    /**
     * Info: (20260413 - Luphia) 2. Strict Environment Lock: Only allow setup if .env is NOT fully validated
     * We bypass this check ONLY for `isSystemSetupComplete` itself so the frontend can check it securely
     */
    if (
      action !== "isSystemSetupComplete" &&
      action !== "getSuperAdminTaskStatus"
    ) {
      const isComplete = await validateEnv();
      if (isComplete) {
        return jsonFail(
          ApiCode.FORBIDDEN,
          "System initialization is already completed. Further setup actions are disabled.",
        );
      }
    }

    /**
     * Info: (20260413 - Luphia) 3. Parse arguments from request body
     * We expect the client to send: { args: [...] }
     */
    let args: unknown[] = [];
    try {
      const bodyText = await request.text();
      if (bodyText) {
        const bodyJSON = JSON.parse(bodyText);
        if (Array.isArray(bodyJSON.args)) {
          args = bodyJSON.args;
        }
      }
    } catch {
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid JSON body payload");
    }

    // Info: (20260413 - Luphia) 4. Dispatch the call dynamically
    const fn = (
      SetupService as Record<string, (...args: unknown[]) => unknown>
    )[action];
    if (typeof fn !== "function") {
      return jsonFail(
        ApiCode.VALIDATION_ERROR,
        `Target '${action}' is not executable`,
      );
    }

    const result = await fn(...args);

    /**
     * Info: (20260413 - Luphia) 5. Respond uniformly using response.ts
     * The previous actions usually returned { success, data, error } directly.
     */
    return jsonOk(result, `Executed setup action: ${action}`);
  } catch (error: unknown) {
    console.error(`[API] Setup Action Error:`, error);
    const msg =
      error instanceof Error ? error.message : "Unknown error occurred";
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, msg);
  }
}
