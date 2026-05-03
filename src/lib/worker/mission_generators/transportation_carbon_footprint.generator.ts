import { ITaskDefinition } from "@/lib/worker/task.generator";
import {
  IMissionParams,
  IMissionDefinition,
} from "@/lib/worker/mission.interface";

export function generateTransportationCarbonFootprintMission(
  params: IMissionParams,
): IMissionDefinition | null {
  const tasks: ITaskDefinition[] = [];

  const payloadStr = JSON.stringify(params.data || {}, null, 2);

  tasks.push({
    type: "TRANSPORTATION_CARBON_FOOTPRINT",
    order: 0,
    data: {
      key: "TRANSPORTATION_CARBON_FOOTPRINT",
      prompt:
        "Please execute transportation carbon footprint calculation with the provided payload:\n" +
        payloadStr,
      context: payloadStr,
    },
  });

  return {
    name: `Transportation Carbon Footprint - ${params.orderId}`,
    tasks,
  };
}
