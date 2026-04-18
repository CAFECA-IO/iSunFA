import { ITaskDefinition } from "@/lib/worker/task.generator";
import {
  IMissionParams,
  IMissionDefinition,
} from "@/lib/worker/mission.interface";

export function generateAiTalkMission(
  params: IMissionParams,
): IMissionDefinition | null {
  const data = (params.data as { question?: string; files?: { base64: string; mimeType: string }[] }) || {};
  const question = data.question;
  const files = data.files || [];

  if (!question) {
    throw new Error("Missing question for AI Talk");
  }

  const tasks: ITaskDefinition[] = [
    {
      type: "AI_TALK_TASK",
      order: 0,
      data: {
        key: "AI_CONSULTING",
        prompt: question, // Info: (20260418 - Luphia) Put the question directly as prompt
        context: "ai_talk",
        files: files,
      },
    },
  ];

  return {
    name: `AI Consultation - ${params.orderId || params.category}`,
    tasks,
  };
}
