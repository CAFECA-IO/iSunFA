import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import {
  generateBaseExternalMission,
  IExternalPromptModule,
} from "@/lib/worker/mission_generators/base_external.generator";
import * as Prompts from "@/constants/prompts/carbon_health_check";

export function generateMission(
  params: IMissionParams,
): IMissionDefinition | null {
  return generateBaseExternalMission(params, Prompts as IExternalPromptModule);
}
