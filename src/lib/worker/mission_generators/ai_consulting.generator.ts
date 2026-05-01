import { ITaskDefinition } from "@/lib/worker/task.generator";
import {
  IMissionParams,
  IMissionDefinition,
} from "@/lib/worker/mission.interface";

export function generateAiConsultingMission(
  params: IMissionParams,
): IMissionDefinition | null {
  const data =
    (params.data as {
      question?: string;
      files?: { base64: string; mimeType: string }[];
    }) || {};
  const question = data.question;
  const files = data.files || [];

  if (!question) {
    console.warn(
      "[AIGenerator] Missing question for AI Talk, using default fallback.",
    );
  }
  const actualQuestion =
    question ||
    "I would like to have a general financial consultation. Please analyze my current status based on any provided context.";

  const tasks: ITaskDefinition[] = [
    {
      type: "AI_CONSULTING_TASK",
      order: 0,
      data: {
        key: "AI_CONSULTING",
        prompt: actualQuestion, // Info: (20260418 - Luphia) Put the question directly as prompt
        context: "ai_consulting",
        files: files,
      },
    },
  ];

  return {
    name: `AI Consultation - ${params.orderId || params.category}`,
    tasks,
  };
}
