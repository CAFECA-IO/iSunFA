import {
  IMissionDefinition,
  IMissionParams,
} from "@/lib/worker/mission.interface";
import {
  generateBaseExternalMission,
  IExternalPromptModule,
} from "@/lib/worker/mission_generators/base_external.generator";
import { generateBaseInternalMission } from "@/lib/worker/mission_generators/base_internal.generator";
import * as Prompts from "@/constants/prompts/carbon_health_check";

export function generateMission(
  params: IMissionParams,
): IMissionDefinition | null {
  if (params.isExternal) {
    return generateBaseExternalMission(
      params,
      Prompts as IExternalPromptModule,
    );
  }

  return generateBaseInternalMission(
    params,
    [{ key: "STEP_0_SCOPE", prompt: Prompts.INTERNAL_SCOPE_PROMPT }],
    Prompts.INTERNAL_FINAL_PROMPT,
  );
}
