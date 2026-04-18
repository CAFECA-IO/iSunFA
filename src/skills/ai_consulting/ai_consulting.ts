import { ITaskSkill } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { Task, Mission } from "@/generated/client";
import { ITaskDefinition } from "@/lib/worker/task.generator";
import { storageService } from "@/services/storage.service";

export class AiConsultingSkill implements ITaskSkill {
  name = "AiConsulting";
  description = "A skill to handle AI consultation interactions for the user.";

  async execute(
    task: Task,
    mission: Mission,
    fullPrompt: string,
    chatService: ChatService,
  ): Promise<string> {
    const taskData = task.data as unknown as ITaskDefinition["data"];
    const files = taskData.files || [];

    // Info: (20260418 - Luphia) Frontend payload now omits base64 to save storage. Load base64 via Laria IPFS on the worker!
    const imagesForAiRaw = await Promise.all(
      files.map(async (f) => {
        const cid = f.id || f.hash;
        if (!cid) {
          console.error(`[AiConsultingSkill] File has no ID or hash, skipping:`, f);
          return null;
        }

        let mimeType = f.mimeType;
        if (!mimeType && f.metadata) {
          try {
            const meta = typeof f.metadata === 'string' ? JSON.parse(f.metadata) : f.metadata;
            mimeType = meta.mimeType;
          } catch { }
        }
        mimeType = mimeType || "image/jpeg";

        try {
          console.log(`[AiConsultingSkill] Recovering Laria file from IPFS hash: ${cid}`);
          const buffer = await storageService.recoverLaria(cid);
          const b64Str = buffer.toString("base64");
          return {
            data: b64Str,
            mimeType,
          };
        } catch (e) {
          console.error(`[AiConsultingSkill] Failed to recover file ${cid} for AI:`, e);
        }
      })
    );

    // Info: (20260418 - Luphia) Filter out any images that failed to recover
    const imagesForAi = imagesForAiRaw.filter(
      (img): img is { data: string; mimeType: string } => !!img?.data
    );

    console.log(`[AiConsultingSkill] Executing ChatService.askAccountTalk...`);
    const { answer, tags } = await chatService.askAccountTalk(
      fullPrompt,
      imagesForAi,
    );

    const stringifiedResult = JSON.stringify({ answer, tags });
    console.log(
      `[AiConsultingSkill] Completed Talk. Result JSON length=${stringifiedResult.length}`,
    );
    return stringifiedResult;
  }
}
