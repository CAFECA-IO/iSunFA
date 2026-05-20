import { prisma } from "@/lib/prisma";
import {
  VoucherTradingType,
  AIAnalysisStatus,
  Prisma,
  EsgScope,
  EsgIntensity,
  Voucher,
  VoucherLine,
} from "@/generated";
import {
  MeasurementUnit,
  EsgGenerationSource,
  DocumentType,
  VoucherPaymentStatus,
} from "@/constants/enums";
import { ISyncDocumentResultParams } from "@/skills/utils/document_parser_db_sync";
import { ACCOUNTS, IAccount } from "@/constants/accounts";
import { ExchangeRateService } from "@/services/exchange_rate.service";
import { VendorRegistry } from "@/services/rules/vendor_registry";
import { ReconciliationService } from "@/services/reconciliation.service";

function mapAccountingCode(country: string, keyword: string): string {
  const accountList = (ACCOUNTS[country as keyof typeof ACCOUNTS] ||
    ACCOUNTS["TW"]) as IAccount[];
  if (!keyword) return accountList[0]?.code || "UNKNOWN";

  // Info: (20260513 - Tzuhan) exact match on code
  const exactCode = accountList.find((a: IAccount) => a.code === keyword);
  if (exactCode) return exactCode.code;

  // Info: (20260513 - Tzuhan) partial match on name
  const matchName = accountList.find(
    (a: IAccount) => a.name.includes(keyword) || keyword.includes(a.name),
  );
  if (matchName) return matchName.code;

  return keyword; // Info: (20260513 - Tzuhan) fallback
}

function getAccountName(country: string, code: string): string {
  const accountList = (ACCOUNTS[country as keyof typeof ACCOUNTS] ||
    ACCOUNTS["TW"]) as IAccount[];
  const exactCode = accountList.find((a: IAccount) => a.code === code);
  return exactCode ? exactCode.name : code;
}

export class DocumentSyncRepository {
  async syncDocumentResultToDatabase({
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
        let fileNode = await tx.file.findFirst({
          where: { hash: fileId },
        });
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
        } else if (fileId && accountBookId) {
          existingJournal = await tx.journal.findFirst({
            where: { file: { hash: fileId }, accountBookId },
            orderBy: { createdAt: "desc" },
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
        } else if (fileId && accountBookId) {
          existingVoucher = await tx.voucher.findFirst({
            where: { file: { hash: fileId }, accountBookId },
            orderBy: { createdAt: "desc" },
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
            receipt: "INCOME",
            outcome: "OUTCOME",
            expense: "OUTCOME",
            payment: "OUTCOME",
            transfer: "TRANSFER",
          };
          const rawType = String(
            vd.tradingType || (vd as Record<string, unknown>).type || "",
          ).toLowerCase();
          const trType = typeMap[rawType] || "INCOME";
          const confidence = parseInt(String(vd.confidence)) || 0;

          // Info: (20260515 - Tzuhan) 攔截器實作：AccountCode Interceptor 與 FX Interceptor
          const vdRecord = vd as Record<string, unknown>;
          const vendorNameStr = String(vdRecord.vendorName || "");
          let linesToCreate: Prisma.VoucherLineCreateWithoutVoucherInput[] = [];

          const docType = vdRecord.documentType || DocumentType.OTHERS;
          let currentPaymentStatus: VoucherPaymentStatus =
            VoucherPaymentStatus.NOT_APPLICABLE;

          if (docType === DocumentType.ACCRUAL_NOTICE) {
            currentPaymentStatus = VoucherPaymentStatus.UNPAID;
          }

          let oldVoucherToClear: (Voucher & { lines: VoucherLine[] }) | null =
            null;
          let finalAiNote = vd.aiNote ?? "無 AI 分析備註";

          if (docType === DocumentType.PAYMENT_RECEIPT) {
            const totalAmountStr = String(vdRecord.totalAmount || "0");
            oldVoucherToClear = await ReconciliationService.findUnpaidVoucher(
              tx,
              vendorNameStr,
              totalAmountStr,
              accountBookId,
            );
          }

          if (oldVoucherToClear) {
            const paymentAccountCode = mapAccountingCode(
              accountBook.country || "TW",
              "1103",
            );
            linesToCreate = ReconciliationService.generateClearingLines(
              oldVoucherToClear,
              paymentAccountCode,
            );
            finalAiNote =
              `[系統稽核] 偵測為付款收據，已自動沖銷前期應付帳款 (Voucher ID: ${oldVoucherToClear.id})\n` +
              finalAiNote;
            currentPaymentStatus = VoucherPaymentStatus.NOT_APPLICABLE;
          } else {
            if (docType === DocumentType.PAYMENT_RECEIPT) {
              currentPaymentStatus = VoucherPaymentStatus.NOT_APPLICABLE;
            }
            const vendorMatch = VendorRegistry.match(vendorNameStr);
            if (vendorMatch) {
              for (const rule of vendorMatch) {
                const fx = await ExchangeRateService.convert({
                  amount: String(vdRecord.totalAmount || 0),
                  fromCurrency: vd.currency || "TWD",
                  toCurrency: "TWD",
                  date: tradingDate,
                });
                linesToCreate.push({
                  accountingCode: rule.accountingCode,
                  particular: `${getAccountName(accountBook.country || "TW", rule.accountingCode)} - ${vendorNameStr}`,
                  amount: BigInt(fx.convertedAmount.round().toFixed(0)),
                  isDebit: rule.isDebit,
                });
              }
            } else {
              for (const l of vd.lines || []) {
                const fx = await ExchangeRateService.convert({
                  amount: l.amount || 0,
                  fromCurrency: vd.currency || "TWD",
                  toCurrency: "TWD",
                  date: tradingDate,
                });
                linesToCreate.push({
                  accountingCode: mapAccountingCode(
                    accountBook.country || "TW",
                    l.accountingCode || "",
                  ),
                  particular: l.particular || null,
                  amount: BigInt(fx.convertedAmount.round().toFixed(0)),
                  isDebit: l.isDebit === true,
                });
              }
            }
          }

          let totalDebit = BigInt(0);
          let totalCredit = BigInt(0);
          for (const l of linesToCreate) {
            if (l.isDebit) totalDebit += BigInt(l.amount as bigint);
            else totalCredit += BigInt(l.amount as bigint);
          }
          const isBalanced =
            totalDebit === totalCredit && linesToCreate.length > 0;
          const finalAnalysisStatus = isBalanced
            ? ("COMPLETED" as AIAnalysisStatus)
            : ("FAILED" as AIAnalysisStatus);
          const finalIsVerified = isBalanced ? confidence > 85 : false;
          if (!isBalanced) {
            finalAiNote = "[系統稽核警告] 憑證借貸不平衡。\n" + finalAiNote;
          }

          const dataPayload: Prisma.VoucherUncheckedCreateInput = {
            tradingDate,
            tradingType: trType as VoucherTradingType,
            note: vd.note ?? "-",
            currency: vd.currency || "TWD",
            fileId: realFileId,
            accountBookId,
            confidence,
            isVerified: finalIsVerified,
            aiNote: finalAiNote,
            analysisStatus: finalAnalysisStatus,
            paymentStatus: currentPaymentStatus,
            lines: {
              create: linesToCreate,
            },
          };

          let finalVoucherId = existingVoucher?.id;

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
            const created = await tx.voucher.create({ data: dataPayload });
            finalVoucherId = created.id;
          }

          if (oldVoucherToClear && finalVoucherId) {
            await tx.voucher.update({
              where: { id: oldVoucherToClear.id },
              data: {
                paymentStatus: VoucherPaymentStatus.PAID,
                clearedByVoucherId: finalVoucherId,
              },
            });
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
        } else if (fileId && accountBookId) {
          existingEsg = await tx.esgRecord.findFirst({
            where: { file: { hash: fileId }, accountBookId },
            orderBy: { createdAt: "desc" },
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
          let isFallbackMatched = false;

          // Info: (20260519 - Tzuhan) 使用 fallbackCategory 進行最大係數 (Max-Factor) 查詢
          const fallbackTag = ed.fallbackCategory?.trim();
          if (!finalCoefficientId && fallbackTag) {
            // Info: (20260519 - Tzuhan) 防禦空字串地圖砲
            const matchedCoefficients = await tx.coefficient.findMany({
              where: {
                AND: [
                  {
                    OR: [
                      { name: { contains: fallbackTag } },
                      { description: { contains: fallbackTag } },
                    ],
                  },
                  {
                    OR: [{ accountBookId: null }, { accountBookId }],
                  },
                ],
                isVerified: true,
              },
              orderBy: { emissionFactor: "desc" },
              take: 1,
            });
            if (matchedCoefficients.length > 0) {
              finalCoefficientId = matchedCoefficients[0].id;
              isFallbackMatched = true;
              ed.aiNote =
                (ed.aiNote || "") +
                `\n[系統匹配] 透過大類標籤「${fallbackTag}」鎖定保守係數。`;
            }
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

          if (finalEmissionSourceId) {
            const sourceExists = await tx.emissionSource.findUnique({
              where: { id: finalEmissionSourceId },
            });
            if (!sourceExists) finalEmissionSourceId = null;
          }

          const esgAmount = new Prisma.Decimal(String(ed.amount) || "0");
          let emissionFactorValue = new Prisma.Decimal(0);
          let isSuspense = false;
          let recordIsVerified = confidence > 85;

          if (finalCoefficientId) {
            const coefExists = await tx.coefficient.findUnique({
              where: { id: finalCoefficientId },
            });
            if (coefExists) {
              emissionFactorValue = coefExists.emissionFactor;
              if (!coefExists.isVerified || isFallbackMatched) {
                recordIsVerified = false; // Info: (20260513 - Tzuhan) Using unverified coefficient makes record unverified
              }
            } else {
              isSuspense = true;
              finalCoefficientId = null;
            }
          } else {
            isSuspense = true;
          }

          let calculatedEmissions = esgAmount.mul(emissionFactorValue);
          let aiNote = ed.aiNote ?? "無 AI 分析備註";

          if (isSuspense) {
            calculatedEmissions = new Prisma.Decimal(0);
            recordIsVerified = false;
            aiNote =
              "[系統稽核警告] 缺乏對應的碳排係數主檔，系統已凍結計算並列入懸記。\n" +
              aiNote;
          }

          const esgData: Prisma.EsgRecordUncheckedCreateInput = {
            accountBookId,
            fileId: realFileId,
            tradingDate: new Date(ed.tradingDate || Date.now()),
            scope: (ed.scope as EsgScope) || "SCOPE_1",
            activityType: ed.activityType || "",
            vendor: ed.vendor || "",
            amount: esgAmount,
            unit: (Object.values(MeasurementUnit).includes(
              ed.unit as MeasurementUnit,
            )
              ? ed.unit
              : MeasurementUnit.KG) as MeasurementUnit,
            emissions: calculatedEmissions,
            intensity: (ed.intensity as EsgIntensity) || null,
            dqiScore: new Prisma.Decimal(String(ed.dqiScore || "0")),
            confidence,
            isVerified: recordIsVerified,
            aiNote,
            analysisStatus: "COMPLETED" as AIAnalysisStatus,
            generationSource: isFallbackMatched
              ? EsgGenerationSource.AI_SPECULATIVE_STAGE_3
              : EsgGenerationSource.SYSTEM_DETERMINISTIC,
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
}

export const documentSyncRepo = new DocumentSyncRepository();
