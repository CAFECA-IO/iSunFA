import { prisma } from '@/lib/prisma';
import { MISSION_STATUS } from '@/constants/status';
import { taskRepo } from '@/repositories/task.repo';
import { Prisma } from '@/generated/client';

export class MissionService {
  /**
   * Info: (20260130 - Luphia)
   * Check if a mission is fully completed (all tasks done).
   * If so, aggregate results from the last order and update Mission status.
   */
  async tryCompleteMission(missionId: string) {
    // Info: (20260130 - Luphia) 1. Check if all tasks are completed/skipped
    const isComplete = await taskRepo.checkMissionCompletion(missionId);
    if (!isComplete) {
      return false;
    }

    console.log(`[MissionService] Finalizing Mission ${missionId}...`);

    // Info: (20260130 - Luphia) 2. Fetch all tasks to find the last order
    const tasks = await prisma.task.findMany({
      where: { missionId },
      orderBy: { order: 'desc' } // Info: (20260130 - Luphia) First item will be highest order
    });

    if (tasks.length === 0) {
      console.warn(`[MissionService] Mission ${missionId} has no tasks.`);
      await taskRepo.completeMission(missionId, MISSION_STATUS.COMPLETED);
      return true;
    }

    const lastOrder = tasks[0].order;
    const lastOrderTasks = tasks.filter(t => t.order === lastOrder);

    /**
     * Info: (20260130 - Luphia) 3. Aggregate results
     * User requirement: "Store only the last order task's result"
     * If multiple tasks in last order, we might need an array or map. 
     * Usually IRSC final synthesis is a single task.
     */
    let finalResult: Prisma.InputJsonValue;

    if (lastOrderTasks.length === 1) {
      finalResult = lastOrderTasks[0].result as unknown as Prisma.InputJsonValue;
    } else {
      finalResult = lastOrderTasks.map(t => t.result) as unknown as Prisma.InputJsonValue;
    }

    // Info: (20260130 - Luphia) 4. Update Mission
    await taskRepo.completeMission(missionId, MISSION_STATUS.COMPLETED, finalResult);

    // Info: (20260310 - Tzuhan) Update Analysis result when mission completes
    await prisma.analysis.updateMany({
      where: { missionId },
      data: { result: finalResult }
    });

    // Info: (20260311 - Tzuhan) Extract tags from MARKET_TAG_EXTRACTION task and link to Analysis
    const tagTask = tasks.find(t => t.type === 'MARKET_TAG_EXTRACTION');
    if (tagTask && tagTask.result) {
      const resultStr = typeof tagTask.result === 'string' ? tagTask.result : JSON.stringify(tagTask.result);
      // Info: (20260311 - Tzuhan) Extract the list of tags
      const match = resultStr.match(/最終決定的標籤清單：\[(.*?)\]/);
      if (match && match[1]) {
        const rawTagsString = match[1];
        // Info: (20260311 - Tzuhan) Sanitization: replace full-width comma, split, trim, and remove leading #
        const extractedTags = rawTagsString
          .replace(/，/g, ',')
          .split(',')
          .map(t => t.trim().replace(/^#/, ''))
          .filter(t => t.length > 0);

        if (extractedTags.length > 0) {
          console.log(`[MissionService] Extracting ${extractedTags.length} tags for Mission ${missionId}:`, extractedTags);
          const analysesContext = await prisma.analysis.findMany({ where: { missionId } });

          if (analysesContext.length > 0) {
            // Info: (20260312 - Tzuhan) Because there can be multiple analyses for a mission (rare but possible), we loop them
            for (const analysis of analysesContext) {
              await prisma.$transaction(async (tx) => {
                for (const tagName of extractedTags) {
                  // Info: (20260312 - Tzuhan) Ensure tag exists
                  const tag = await tx.tag.upsert({
                    where: { name: tagName },
                    update: {},
                    create: { name: tagName }
                  });

                  // Info: (20260312 - Tzuhan) Ensure relation exists
                  await tx.analysisTag.upsert({
                    where: {
                      analysisId_tagId: {
                        analysisId: analysis.id,
                        tagId: tag.id
                      }
                    },
                    update: {},
                    create: {
                      analysisId: analysis.id,
                      tagId: tag.id
                    }
                  });
                }
              });
            }
          }
        }
      }
    }

    console.log(`[MissionService] Mission ${missionId} Completed.`);

    return true;
  }
}

export const missionService = new MissionService();
