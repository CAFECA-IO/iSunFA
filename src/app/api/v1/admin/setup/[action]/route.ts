import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import * as CoreSetupService from "@/services/setup.service";
import * as BlockchainSetupService from "@/services/setup.blockchain.service";
import * as StateSetupService from "@/services/setup.state.service";
import * as AuthSetupService from "@/services/setup.auth.service";
import * as EnvSetupService from "@/services/setup.env.service";
import * as DbSetupService from "@/services/setup.db.service";
import * as DeploySetupService from "@/services/deploy.service";

const SetupService = {
  ...StateSetupService,
  ...DbSetupService,
  ...EnvSetupService,
  ...BlockchainSetupService,
  ...AuthSetupService,
  ...DeploySetupService,
  ...CoreSetupService
};
import { validateEnv } from "@/validators/env";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ action: string }> },
) {
  try {
    const { action } = await params;

    // Info: (20260413 - Luphia) 1. Validate if the action exists in our service
    if (!(action in SetupService)) {
      return jsonFail(API_ERRORS.NF_ACTION);
    }

    /**
     * Info: (20260413 - Luphia) 2. Strict Environment Lock: Only allow setup if .env is NOT fully validated
     * We bypass this check ONLY for `isSystemSetupComplete` itself so the frontend can check it securely
     */
    if (
      action !== "isSystemSetupComplete" &&
      action !== "getSuperAdminTaskStatus" &&
      action !== "deployContracts" &&
      action !== "getDeployProgress" &&
      action !== "checkHasExistingContracts" &&
      action !== "verifyContractDependencies"
    ) {
      const isComplete = await validateEnv();
      if (isComplete) {
        return jsonFail({ code: "FO000099", message: "System initialized already", status: ApiCode.FORBIDDEN });
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
      return jsonFail(API_ERRORS.VL_INVALID_JSON);
    }

    // Info: (20260413 - Luphia) 4. Dispatch the call dynamically
    const fn = (
      SetupService as Record<string, (...args: unknown[]) => unknown>
    )[action];
    if (typeof fn !== "function") {
      return jsonFail({ code: "VL000099", message: String(`Target '${action}' is not executable`).slice(0, 30), status: ApiCode.VALIDATION_ERROR });
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
    return jsonFail({ code: "IS000099", message: String(msg).slice(0, 30), status: ApiCode.INTERNAL_SERVER_ERROR });
  }
}
