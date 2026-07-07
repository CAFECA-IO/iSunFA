import { ITaskSkill } from "@/skills/types";
import { SchemaType, Schema } from "@google/generative-ai";
import { AI_CONSULTATION_ROOM_PROMPT } from "@/constants/prompts/ai_consultation_room";
import { ChatService } from "@/services/chat.service";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ITaskDefinition } from "@/lib/worker/task.generator";
import { storageService } from "@/services/storage.service";

export class AiConsultingSkill implements ITaskSkill {
  name = "AiConsulting";
  description = "A skill to handle AI consultation interactions for the user.";

  async execute(
    task: IPseudoTask,
    mission: IPseudoMission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string> {
    const taskData = task.data as unknown as ITaskDefinition["data"];
    const files = taskData.files || [];

    // Info: (20260418 - Luphia) Frontend payload now omits base64 to save storage. Load base64 via Laria IPFS on the worker!
    const imagesForAiRaw = await Promise.all(
      files.map(async (f: unknown) => {
        const cid =
          typeof f === "string" ? f : (f as Record<string, string>).hash;
        if (!cid) {
          console.error(
            `[AiConsultingSkill] File has no ID or hash, skipping:`,
            f,
          );
          return null;
        }

        let mimeType =
          typeof f === "string"
            ? "image/jpeg"
            : (f as Record<string, string>).mimeType;
        if (
          !mimeType &&
          typeof f !== "string" &&
          (f as Record<string, unknown>).metadata
        ) {
          try {
            const metaRaw = (f as Record<string, unknown>).metadata;
            const meta =
              typeof metaRaw === "string" ? JSON.parse(metaRaw) : metaRaw;
            mimeType = meta.mimeType;
          } catch {}
        }
        mimeType = mimeType || "image/jpeg";

        try {
          console.log(
            `[AiConsultingSkill] Recovering Laria file from IPFS hash: ${cid}`,
          );
          const buffer = await storageService.recoverLaria(cid);
          const b64Str = buffer.toString("base64");
          return {
            data: b64Str,
            mimeType,
          };
        } catch (e) {
          console.error(
            `[AiConsultingSkill] Failed to recover file ${cid} for AI:`,
            e,
          );
        }
      }),
    );

    // Info: (20260418 - Luphia) Filter out any images that failed to recover
    const imagesForAi = imagesForAiRaw.filter(
      (img): img is { data: string; mimeType: string } => !!img?.data,
    );

    console.log(`[AiConsultingSkill] Executing AI Consultation...`);

    const promptText = AI_CONSULTATION_ROOM_PROMPT.replace(
      "{{message}}",
      fullPrompt,
    );

    let answer = "AI 暫時無法回答，請稍後再試。";
    let tags = ["錯誤"];

    try {
      const responseSchema = {
        type: SchemaType.OBJECT,
        properties: {
          answer: { type: SchemaType.STRING },
          tags: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
        },
        required: ["answer", "tags"],
      };

      const responseText = await chatService.generateRawWithImages(
        promptText,
        imagesForAi,
        true,
        responseSchema as Schema,
      );
      const parsed = JSON.parse(responseText);
      answer = parsed.answer || responseText;
      tags = Array.isArray(parsed.tags) ? parsed.tags : ["其他"];
    } catch (error) {
      console.error("[AiConsultingSkill] Error in AI consultation:", error);
    }

    const stringifiedResult = JSON.stringify({ answer, tags });
    console.log(
      `[AiConsultingSkill] Completed Talk. Result JSON length=${stringifiedResult.length}`,
    );
    return stringifiedResult;
  }
}
