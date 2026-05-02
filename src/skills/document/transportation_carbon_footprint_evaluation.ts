import { ITaskSkill } from "@/skills/types";
import { IPseudoTask } from "@/skills/types";
import { calculateLogisticsPlan } from "@/services/route.service";

export class TransportationCarbonFootprintEvaluationSkill implements ITaskSkill {
  name = "TRANSPORTATION_CARBON_FOOTPRINT";
  description = "Calculate the transportation carbon footprint based on origin, destination, and weight.";
  parameters = {
    type: "object",
    properties: {},
    required: [],
  };

  async execute(task: IPseudoTask): Promise<string> {
    const payloadStr = (task.data?.context as string) || "{}";
    let payload: Record<string, unknown> = {};
    try {
      payload = JSON.parse(payloadStr);
    } catch {}

    const origin = payload.origin as { lat: string | number; lng: string | number } | undefined;
    const dest = payload.dest as { lat: string | number; lng: string | number } | undefined;
    const weightKg = payload.weightKg as string | number | undefined;
    
    if (!origin || !dest || origin.lat === undefined || origin.lng === undefined || dest.lat === undefined || dest.lng === undefined) {
      throw new Error("Missing required coordinates.");
    }

    const plan = await calculateLogisticsPlan(
      Number(origin.lat), Number(origin.lng),
      Number(dest.lat), Number(dest.lng),
      Number(weightKg || 1000)
    );

    return JSON.stringify(plan, null, 2);
  }
}
