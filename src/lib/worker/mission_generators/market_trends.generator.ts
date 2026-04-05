import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import {
  generateBaseExternalMission,
  IExternalPromptModule,
} from "@/lib/worker/mission_generators/base_external.generator";
import * as Prompts from "@/constants/prompts/market_analysis";

export function generateMission(
  params: IMissionParams,
): IMissionDefinition | null {
  return generateBaseExternalMission(params, Prompts as IExternalPromptModule);
}
