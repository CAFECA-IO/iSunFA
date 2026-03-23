import { prisma } from "@/lib/prisma";
import { MISSION_STATUS } from "@/constants/status";
import { taskRepo } from "@/repositories/task.repo";
import { Prisma } from "@/generated/client";
import { VoucherTradingType, AIAnalysisStatus } from "@/generated/client";
import { IParsedVoucherLine } from "@/interfaces/voucher";

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
      orderBy: { order: "desc" }, // Info: (20260130 - Luphia) First item will be highest order
    });

    if (tasks.length === 0) {
      console.warn(`[MissionService] Mission ${missionId} has no tasks.`);
      await taskRepo.completeMission(missionId, MISSION_STATUS.COMPLETED);
      return true;
    }

    const lastOrder = tasks[0].order;
    const lastOrderTasks = tasks.filter((t) => t.order === lastOrder);

    /**
     * Info: (20260130 - Luphia) 3. Aggregate results
     * User requirement: "Store only the last order task's result"
     * If multiple tasks in last order, we might need an array or map.
     * Usually IRSC final synthesis is a single task.
     */
    let finalResult: Prisma.InputJsonValue;

    if (lastOrderTasks.length === 1) {
      finalResult = lastOrderTasks[0]
        .result as unknown as Prisma.InputJsonValue;
    } else {
      finalResult = lastOrderTasks.map(
        (t) => t.result,
      ) as unknown as Prisma.InputJsonValue;
    }

    // Info: (20260320 - Julian) 如果有失敗的任務，也把 Mission 標註為失敗
    const isMissionFailed = lastOrderTasks.some((t) => t.status === "FAILED");
    const finalMissionStatus = isMissionFailed
      ? "FAILED"
      : MISSION_STATUS.COMPLETED;

    // Info: (20260130 - Luphia) 4. Update Mission
    await taskRepo.completeMission(missionId, finalMissionStatus, finalResult);

    // Info: (20260319 - Julian) 4.5. 處理日記帳、傳票、碳盤查
    const journalTask = tasks.find((t) => t.type === "JOURNAL_PARSING");
    const voucherTask = tasks.find((t) => t.type === "VOUCHER_PARSING");
    const esgTask = tasks.find((t) => t.type === "ESG_PARSING");

    if (journalTask || voucherTask || esgTask) {
      try {
        const taskData = (journalTask?.data ||
          voucherTask?.data ||
          esgTask?.data) as { context: string };
        const context = JSON.parse(taskData?.context || "{}");
        const fileId = context.fileId;
        const accountBookId = context.accountBookId;

        if (fileId && accountBookId) {
          await prisma.$transaction(async (tx) => {
            // Info: (20260323 - Julian) 更新或建立日記帳
            if (journalTask) {
              const jStatus =
                journalTask.status.toUpperCase() === "FAILED"
                  ? "FAILED"
                  : "COMPLETED";

              const existingJournal = await tx.journal.findFirst({
                where: { fileId, accountBookId },
              });

              if (jStatus === "FAILED") {
                if (existingJournal) {
                  await tx.journal.update({
                    where: { id: existingJournal.id },
                    data: { analysisStatus: "FAILED" as AIAnalysisStatus },
                  });
                }
              } else if (
                journalTask.result &&
                typeof journalTask.result === "string"
              ) {
                try {
                  const parsed = JSON.parse(journalTask.result);
                  if (parsed && typeof parsed === "object") {
                    const jd = parsed.data || parsed;
                    const tradingDate = new Date(jd.tradingDate || new Date());
                    const confidence = parseInt(String(jd.confidence)) || 0;

                    const dataPayload: Prisma.JournalUncheckedCreateInput = {
                      tradingDate,
                      text: jd.text || null,
                      fileId,
                      accountBookId,
                      analysisStatus: "COMPLETED" as AIAnalysisStatus,
                      confidence,
                      isVerified: confidence > 85, // Info: (20260323 - Julian) 預設 85 分以上自動驗證
                    };

                    if (existingJournal) {
                      await tx.journal.update({
                        where: { id: existingJournal.id },
                        data: { ...dataPayload },
                      });
                    } else {
                      await tx.journal.create({ data: dataPayload });
                    }
                  } else {
                    // Info: (20260323 - Julian) 如果解析失敗，更新日記帳狀態為失敗
                    if (existingJournal) {
                      await tx.journal.update({
                        where: { id: existingJournal.id },
                        data: { analysisStatus: "FAILED" as AIAnalysisStatus },
                      });
                    }
                  }
                } catch (e) {
                  console.error(
                    "[MissionService] Failed to parse journal result",
                    e,
                  );
                }
              }
            }

            // Info: (20260320 - Julian) 更新或建立傳票
            if (voucherTask) {
              const vStatus =
                voucherTask.status.toUpperCase() === "FAILED"
                  ? "FAILED"
                  : "COMPLETED";
              const existingVoucher = await tx.voucher.findFirst({
                where: { fileId, accountBookId },
              });

              if (vStatus === "FAILED") {
                if (existingVoucher) {
                  await tx.voucher.update({
                    where: { id: existingVoucher.id },
                    data: { analysisStatus: "FAILED" as AIAnalysisStatus },
                  });
                }
              } else if (
                voucherTask.result &&
                typeof voucherTask.result === "string"
              ) {
                try {
                  const parsed = JSON.parse(voucherTask.result);
                  if (parsed && typeof parsed === "object") {
                    const vd = parsed.data || parsed;
                    const tradingDate = new Date(vd.tradingDate || new Date());
                    const typeMap: Record<string, VoucherTradingType> = {
                      income: "INCOME",
                      outcome: "OUTCOME",
                      transfer: "TRANSFER",
                    };
                    const trType =
                      typeMap[String(vd.tradingType).toLowerCase()] || "INCOME";
                    const confidence = parseInt(String(vd.confidence)) || 0;

                    const dataPayload: Prisma.VoucherUncheckedCreateInput = {
                      tradingDate,
                      tradingType: trType as VoucherTradingType,
                      note: vd.note || null,
                      currency: vd.currency || "TWD",
                      fileId,
                      accountBookId,
                      confidence,
                      isVerified: confidence > 85,
                      analysisStatus: "COMPLETED" as AIAnalysisStatus,
                      lines: {
                        create: (vd.lines || []).map(
                          (l: IParsedVoucherLine) => ({
                            accountingCode: l.accountingCode || "",
                            particular: l.particular || null,
                            amount: parseFloat(String(l.amount)) || 0,
                            isDebit: l.isDebit === true,
                          }),
                        ),
                      },
                    };

                    if (existingVoucher) {
                      await tx.voucher.update({
                        where: { id: existingVoucher.id },
                        data: {
                          ...dataPayload,
                          lines: {
                            deleteMany: {}, // Info: (20260320 - Julian) 清除舊的傳票項目
                            create: (vd.lines || []).map(
                              (l: IParsedVoucherLine) => ({
                                accountingCode: l.accountingCode || "",
                                particular: l.particular || null,
                                amount: parseFloat(String(l.amount)) || 0,
                                isDebit: l.isDebit === true,
                              }),
                            ),
                          },
                        },
                      });
                    } else {
                      await tx.voucher.create({ data: dataPayload });
                    }
                  } else {
                    // Info: (20260323 - Julian) 如果解析失敗，更新傳票狀態為失敗
                    if (existingVoucher) {
                      await tx.voucher.update({
                        where: { id: existingVoucher.id },
                        data: { analysisStatus: "FAILED" as AIAnalysisStatus },
                      });
                    }
                  }
                } catch (e) {
                  console.error(
                    "[MissionService] Failed to parse voucher result",
                    e,
                  );
                }
              }
            }

            // Info: (20260320 - Julian) 更新或建立碳盤查
            if (esgTask) {
              const eStatus =
                esgTask.status.toUpperCase() === "FAILED"
                  ? "FAILED"
                  : "COMPLETED";
              const existingEsg = await tx.esgRecord.findFirst({
                where: { fileId, accountBookId },
              });

              if (eStatus === "FAILED") {
                if (existingEsg) {
                  await tx.esgRecord.update({
                    where: { id: existingEsg.id },
                    data: { analysisStatus: "FAILED" as AIAnalysisStatus },
                  });
                }
              } else if (esgTask.result && typeof esgTask.result === "string") {
                try {
                  const match = esgTask.result.match(/\{[\s\S]*\}/);
                  if (match) {
                    const parsed = JSON.parse(match[0]);
                    const ed = parsed.data || parsed;
                    const confidence = parseInt(String(ed.confidence)) || 0;
                    const esgData: Prisma.EsgRecordUncheckedCreateInput = {
                      accountBookId,
                      fileId,
                      dateTimestamp:
                        ed.dateTimestamp || Math.floor(Date.now() / 1000),
                      scope: ed.scope || "SCOPE_1",
                      activityType: ed.activityType || "",
                      vendor: ed.vendor || "",
                      rawActivityData: String(ed.rawActivityData || ""),
                      unit: ed.unit || "",
                      emissions: parseFloat(String(ed.emissions)) || 0,
                      intensity: ed.intensity || "LOW",
                      confidence,
                      isVerified: confidence > 85,
                      analysisStatus: "COMPLETED" as AIAnalysisStatus,
                    };

                    if (existingEsg) {
                      await tx.esgRecord.update({
                        where: { id: existingEsg.id },
                        data: esgData,
                      });
                    } else {
                      await tx.esgRecord.create({ data: esgData });
                    }
                  } else {
                    // Info: (20260323 - Julian) 如果解析失敗，更新碳盤查狀態為失敗
                    if (existingEsg) {
                      await tx.esgRecord.update({
                        where: { id: existingEsg.id },
                        data: { analysisStatus: "FAILED" as AIAnalysisStatus },
                      });
                    }
                  }
                } catch (e) {
                  console.error(
                    "[MissionService] Failed to parse ESG result",
                    e,
                  );
                }
              }
            }
          });
        }
      } catch (e) {
        console.error(
          "[MissionService] Error persisting document parsing results:",
          e,
        );
      }
    }

    // Info: (20260310 - Tzuhan) Update Analysis result when mission completes
    await prisma.analysis.updateMany({
      where: { missionId },
      data: { result: finalResult },
    });

    // Info: (20260311 - Tzuhan) Extract tags from MARKET_TAG_EXTRACTION task and link to Analysis
    const tagTask = tasks.find((t) => t.type === "MARKET_TAG_EXTRACTION");
    if (tagTask && tagTask.result) {
      const resultStr =
        typeof tagTask.result === "string"
          ? tagTask.result
          : JSON.stringify(tagTask.result);
      // Info: (20260311 - Tzuhan) Extract the list of tags
      const match = resultStr.match(/最終決定的標籤清單：\[(.*?)\]/);
      if (match && match[1]) {
        const rawTagsString = match[1];
        // Info: (20260311 - Tzuhan) Sanitization: replace full-width comma, split, trim, and remove leading #
        const extractedTags = rawTagsString
          .replace(/，/g, ",")
          .split(",")
          .map((t) => t.trim().replace(/^#/, ""))
          .filter((t) => t.length > 0);

        if (extractedTags.length > 0) {
          console.log(
            `[MissionService] Extracting ${extractedTags.length} tags for Mission ${missionId}:`,
            extractedTags,
          );
          const analysesContext = await prisma.analysis.findMany({
            where: { missionId },
          });

          if (analysesContext.length > 0) {
            // Info: (20260312 - Tzuhan) Because there can be multiple analyses for a mission (rare but possible), we loop them
            for (const analysis of analysesContext) {
              await prisma.$transaction(async (tx) => {
                for (const tagName of extractedTags) {
                  // Info: (20260312 - Tzuhan) Ensure tag exists
                  const tag = await tx.tag.upsert({
                    where: { name: tagName },
                    update: {},
                    create: { name: tagName },
                  });

                  // Info: (20260312 - Tzuhan) Ensure relation exists
                  await tx.analysisTag.upsert({
                    where: {
                      analysisId_tagId: {
                        analysisId: analysis.id,
                        tagId: tag.id,
                      },
                    },
                    update: {},
                    create: {
                      analysisId: analysis.id,
                      tagId: tag.id,
                    },
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
