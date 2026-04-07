import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import { generateBaseInternalMission } from "@/lib/worker/mission_generators/base_internal.generator";
import * as Prompts from "@/constants/prompts/income_statement";

export function generateMission(
  params: IMissionParams,
): IMissionDefinition | null {
  return generateBaseInternalMission(
    params,
    [
      { key: "REVENUE", prompt: Prompts.REVENUE_PROMPT },
      { key: "PROFITABILITY", prompt: Prompts.PROFITABILITY_PROMPT },
      { key: "COST_STRUCTURE", prompt: Prompts.COST_STRUCTURE_PROMPT },
    ],
    Prompts.FINAL_PROMPT,
  );
}
