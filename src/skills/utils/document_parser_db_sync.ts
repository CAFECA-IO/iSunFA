import { prisma } from "@/lib/prisma";
import {
  VoucherTradingType,
  AIAnalysisStatus,
  Prisma,
  EsgScope,
  EsgIntensity,
} from "@/generated";
import { IParsedVoucherLine } from "@/interfaces/voucher";

export interface IDocNode {
  data?: IDocNode;
  tradingDate?: string | Date;
  confidence?: number | string;
  text?: string;
  aiNote?: string;
  tradingType?: string;
  note?: string;
  currency?: string;
  lines?: IParsedVoucherLine[];
  coefficientId?: string;
  newCoefficient?: {
    name?: string;
    description?: string;
    unit?: string;
    emissionFactor?: number | string;
    source?: string;
  };
  emissionSourceId?: string;
  newEmissionSource?: {
    name?: string;
    description?: string;
    unit?: string;
    emissionFactor?: number | string;
    source?: string;
  };
  scope?: string;
  activityType?: string;
  vendor?: string;
  amount?: number | string;
  unit?: string;
  emissions?: number | string;
  intensity?: unknown;
  dqiScore?: number | string;
}

export interface IAggregatedDocumentResult {
  journal?: IDocNode;
  voucherBase?: IDocNode;
  voucherLines?: IDocNode;
  esg?: IDocNode;
  failureReason?: string;
}

export interface ISyncDocumentResultParams {
  fileId: string;
  accountBookId: string;
  result: IAggregatedDocumentResult;
  voucherIdContext?: string;
  esgRecordIdContext?: string;
  journalIdContext?: string;
}

export async function syncDocumentResultToDatabase({
  fileId,
  accountBookId,
  result,
  voucherIdContext,
  esgRecordIdContext,
  journalIdContext,
}: ISyncDocumentResultParams) {
  if (
    !accountBookId ||
    (!fileId && !voucherIdContext && !esgRecordIdContext && !journalIdContext)
  ) {
    return false;
  }

  const { journal, voucherBase, voucherLines, esg, failureReason } = result;

  await prisma.$transaction(async (tx) => {
    // Info: (20260426 - Luphia) Validate if accountBookId exists to prevent FK violation on mock test tasks
    const accountBook = await tx.accountBook.findUnique({
      where: { id: accountBookId },
    });
    if (!accountBook) {
      console.warn(
        `[syncDocumentResultToDatabase] accountBookId ${accountBookId} not found. Skipping DB sync.`,
      );
      return;
    }

    let realFileId: string | undefined = undefined;
    if (fileId) {
      let fileNode = await tx.file.findFirst({ where: { hash: fileId } });
      if (!fileNode) {
        fileNode = await tx.file.create({ data: { hash: fileId } });
      }
      realFileId = fileNode.id;
    }

    // Info: (20260420 - Luphia) 1. Sync Journal
    if (journal || failureReason) {
      let existingJournal = null;
      if (journalIdContext) {
        existingJournal = await tx.journal.findUnique({
          where: { id: journalIdContext },
        });
      } else if (realFileId && accountBookId) {
        existingJournal = await tx.journal.findFirst({
          where: { fileId: realFileId, accountBookId },
        });
      }

      if (failureReason && !journal) {
        if (existingJournal) {
          await tx.journal.update({
            where: { id: existingJournal.id },
            data: {
              analysisStatus: "FAILED" as AIAnalysisStatus,
              aiNote: failureReason,
            },
          });
        }
      } else if (journal) {
        const jd = journal.data || journal;
        const tradingDate = new Date(jd.tradingDate || new Date());
        const confidence = parseInt(String(jd.confidence)) || 0;

        const dataPayload: Prisma.JournalUncheckedCreateInput = {
          tradingDate,
          text: jd.text || "",
          fileId: realFileId,
          accountBookId,
          analysisStatus: "COMPLETED" as AIAnalysisStatus,
          confidence,
          isVerified: confidence > 85,
          aiNote: jd.aiNote ?? "無 AI 分析備註",
        };

        if (existingJournal) {
          await tx.journal.update({
            where: { id: existingJournal.id },
            data: dataPayload,
          });
        } else {
          await tx.journal.create({ data: dataPayload });
        }
      }
    }

    // Info: (20260420 - Luphia) 2. Sync Voucher
    if (voucherBase || voucherLines || failureReason) {
      let existingVoucher = null;
      if (voucherIdContext) {
        existingVoucher = await tx.voucher.findUnique({
          where: { id: voucherIdContext },
        });
      } else if (realFileId && accountBookId) {
        existingVoucher = await tx.voucher.findFirst({
          where: { fileId: realFileId, accountBookId },
        });
      }

      if (failureReason && !voucherBase && !voucherLines) {
        if (existingVoucher) {
          await tx.voucher.update({
            where: { id: existingVoucher.id },
            data: {
              analysisStatus: "FAILED" as AIAnalysisStatus,
              aiNote: failureReason,
            },
          });
        }
      } else if (voucherBase || voucherLines) {
        const vd = {
          ...(voucherBase?.data || voucherBase || {}),
          ...(voucherLines?.data || voucherLines || {}),
          aiNote: `- 基本資訊分析：${voucherBase?.aiNote || voucherBase?.data?.aiNote || ""}\n- 會計科目分錄分析：${voucherLines?.aiNote || voucherLines?.data?.aiNote || ""}`,
        };
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
          note: vd.note ?? "-",
          currency: vd.currency || "TWD",
          fileId: realFileId,
          accountBookId,
          confidence,
          isVerified: confidence > 85,
          aiNote: vd.aiNote ?? "無 AI 分析備註",
          analysisStatus: "COMPLETED" as AIAnalysisStatus,
          lines: {
            create: (vd.lines || []).map((l: IParsedVoucherLine) => ({
              accountingCode: l.accountingCode || "",
              particular: l.particular || null,
              amount: parseFloat(String(l.amount)) || 0,
              isDebit: l.isDebit === true,
            })),
          },
        };

        if (existingVoucher) {
          await tx.voucher.update({
            where: { id: existingVoucher.id },
            data: {
              ...dataPayload,
              lines: {
                deleteMany: {},
                create: dataPayload.lines?.create || [],
              },
            },
          });
        } else {
          await tx.voucher.create({ data: dataPayload });
        }
      }
    }

    // Info: (20260420 - Luphia) 3. Sync ESG
    if (esg || failureReason) {
      let existingEsg = null;
      if (esgRecordIdContext) {
        existingEsg = await tx.esgRecord.findUnique({
          where: { id: esgRecordIdContext },
        });
      } else if (realFileId && accountBookId) {
        existingEsg = await tx.esgRecord.findFirst({
          where: { fileId: realFileId, accountBookId },
        });
      }

      if (failureReason && !esg) {
        if (existingEsg) {
          await tx.esgRecord.update({
            where: { id: existingEsg.id },
            data: {
              analysisStatus: "FAILED" as AIAnalysisStatus,
              aiNote: failureReason,
            },
          });
        }
      } else if (esg) {
        const ed = esg.data || esg;
        const confidence = parseInt(String(ed.confidence)) || 0;
        let finalCoefficientId = ed.coefficientId || null;
        let finalEmissionSourceId = ed.emissionSourceId || null;

        // Info: (20260430 - Julian) 將 AI 提供的新係數加入 DB
        if (ed.newCoefficient && ed.newCoefficient.name) {
          const newCoef = await tx.coefficient.create({
            data: {
              name: ed.newCoefficient.name,
              description: ed.newCoefficient.description || "",
              unit: ed.newCoefficient.unit || "",
              emissionFactor:
                parseFloat(String(ed.newCoefficient.emissionFactor)) || 0,
              source: ed.newCoefficient.source || "AI 動態擷取",
              accountBookId: null,
            },
          });
          finalCoefficientId = newCoef.id;
        }

        // Info: (20260430 - Julian) 將 AI 提供的新排放源歸口加入 DB
        if (ed.newEmissionSource && ed.newEmissionSource.name) {
          const newEmissionSource = await tx.emissionSource.create({
            data: {
              name: ed.newEmissionSource.name,
              accountBookId: accountBookId, // Info: (20260430 - Julian) 歸屬到當前帳本
            },
          });
          finalEmissionSourceId = newEmissionSource.id;
        }

        if (finalCoefficientId) {
          const coefExists = await tx.coefficient.findUnique({
            where: { id: finalCoefficientId },
          });
          if (!coefExists) finalCoefficientId = null;
        }

        if (finalEmissionSourceId) {
          const sourceExists = await tx.emissionSource.findUnique({
            where: { id: finalEmissionSourceId },
          });
          if (!sourceExists) finalEmissionSourceId = null;
        }

        const esgData: Prisma.EsgRecordUncheckedCreateInput = {
          accountBookId,
          fileId: realFileId,
          tradingDate: new Date(ed.tradingDate || Date.now()),
          scope: (ed.scope as EsgScope) || "SCOPE_1",
          activityType: ed.activityType || "",
          vendor: ed.vendor || "",
          amount: parseFloat(String(ed.amount)) || 0,
          unit: ed.unit || "",
          emissions: parseFloat(String(ed.emissions)) || 0,
          intensity: (ed.intensity as EsgIntensity) || null,
          dqiScore: parseFloat(String(ed.dqiScore)) || 0,
          confidence,
          isVerified: confidence > 85,
          aiNote: ed.aiNote ?? "無 AI 分析備註",
          analysisStatus: "COMPLETED" as AIAnalysisStatus,
          coefficientId: finalCoefficientId,
          emissionSourceId: finalEmissionSourceId,
        };

        if (existingEsg) {
          await tx.esgRecord.update({
            where: { id: existingEsg.id },
            data: esgData,
          });
        } else {
          await tx.esgRecord.create({ data: esgData });
        }
      }
    }
  });

  return true;
}
