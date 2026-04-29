import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import { generateBaseInternalMission } from "@/lib/worker/mission_generators/base_internal.generator";
import * as Prompts from "@/constants/prompts/balance_sheet";


export function generateMission(
  params: IMissionParams,
): IMissionDefinition | null {
  const filteredParams = {
    ...params,
  };

  return generateBaseInternalMission(
    filteredParams,
    [
      { key: "LIQUIDITY", prompt: Prompts.LIQUIDITY_PROMPT },
      { key: "SOLVENCY", prompt: Prompts.SOLVENCY_PROMPT },
      { key: "ASSET_QUALITY", prompt: Prompts.ASSET_QUALITY_PROMPT },
    ],
    Prompts.FINAL_PROMPT,
  );
}
