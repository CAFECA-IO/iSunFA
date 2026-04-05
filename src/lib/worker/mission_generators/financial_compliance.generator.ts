import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import { generateBaseInternalMission } from "@/lib/worker/mission_generators/base_internal.generator";
import * as Prompts from "@/constants/prompts/financial_compliance";

export function generateMission(
  params: IMissionParams,
): IMissionDefinition | null {
  return generateBaseInternalMission(
    params,
    [
      { key: "FRAUD_DETECTION", prompt: Prompts.FRAUD_DETECTION_PROMPT },
      {
        key: "ABNORMAL_TRANSACTIONS",
        prompt: Prompts.ABNORMAL_TRANSACTIONS_PROMPT,
      },
      { key: "REGULATORY", prompt: Prompts.REGULATORY_COMPLIANCE_PROMPT },
    ],
    Prompts.FINAL_PROMPT,
  );
}
