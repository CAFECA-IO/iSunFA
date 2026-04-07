import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import { generateBaseInternalMission } from "@/lib/worker/mission_generators/base_internal.generator";
import * as Prompts from "@/constants/prompts/cash_flow";

export function generateMission(
  params: IMissionParams,
): IMissionDefinition | null {
  return generateBaseInternalMission(
    params,
    [
      { key: "OPERATING", prompt: Prompts.OPERATING_PROMPT },
      { key: "INVESTING", prompt: Prompts.INVESTING_PROMPT },
      { key: "FINANCING", prompt: Prompts.FINANCING_PROMPT },
    ],
    Prompts.FINAL_PROMPT,
  );
}
