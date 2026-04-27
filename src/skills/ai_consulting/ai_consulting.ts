import { ITaskSkill } from "@/skills/types";
import { ChatService } from "@/services/chat.service";
import { IPseudoTask, IPseudoMission } from "@/skills/types";
import { ITaskDefinition } from "@/lib/worker/task.generator";
import { storageService } from "@/services/storage.service";
import { prisma } from "@/lib/prisma";

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
        const cid = typeof f === 'string' ? f : (f as Record<string, string>).hash;
        if (!cid) {
          console.error(`[AiConsultingSkill] File has no ID or hash, skipping:`, f);
          return null;
        }

        let mimeType = typeof f === 'string' ? "image/jpeg" : (f as Record<string, string>).mimeType;
        if (!mimeType && typeof f !== 'string' && (f as Record<string, unknown>).metadata) {
          try {
            const metaRaw = (f as Record<string, unknown>).metadata;
            const meta = typeof metaRaw === 'string' ? JSON.parse(metaRaw) : metaRaw;
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

    console.log(`[AiConsultingSkill] Executing ChatService.askAccountTalkStream...`);

    let lastUpdateTime = 0;
    const UPDATE_INTERVAL_MS = 1000;
    
    // Info: (20260427 - Julian) 取出關聯的 Analysis
    const analysis = await prisma.analysis.findFirst({
      where: { orderId: mission.id }
    });

    const { answer, tags } = await chatService.askAccountTalkStream(
      fullPrompt,
      imagesForAi,
      async (partialAnswer) => {
        const now = Date.now();
        if (now - lastUpdateTime > UPDATE_INTERVAL_MS && analysis) {
          lastUpdateTime = now;
          try {
            await prisma.analysis.update({
              where: { id: analysis.id },
              data: {
                result: {
                  answer: partialAnswer,
                  tags: ["生成中..."],
                  isGenerating: true,
                }
              }
            });
          } catch (e) {
            console.error(`[AiConsultingSkill] Failed to update partial result to DB:`, e);
          }
        }
      }
    );

    const stringifiedResult = JSON.stringify({ answer, tags, isGenerating: false });
    console.log(
      `[AiConsultingSkill] Completed Talk. Result JSON length=${stringifiedResult.length}`,
    );
    return stringifiedResult;
  }
}
