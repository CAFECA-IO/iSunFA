import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import { generateBaseInternalMission } from "@/lib/worker/mission_generators/base_internal.generator";
import * as Prompts from "@/constants/prompts/financial_health";

export function generateMission(
  params: IMissionParams,
): IMissionDefinition | null {
  return generateBaseInternalMission(
    params,
    [
      { key: "DUPONT", prompt: Prompts.DUPONT_PROMPT },
      { key: "GROWTH", prompt: Prompts.GROWTH_PROMPT },
      { key: "WORKING_CAPITAL", prompt: Prompts.WORKING_CAPITAL_PROMPT },
    ],
    Prompts.FINAL_PROMPT,
  );
}
