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
import { VendorRegistry } from "@/services/rules/vendor_registry";
import { ReconciliationService } from "@/services/reconciliation.service";
import { MoneyUtil } from "@/lib/utils/money";
import { EmissionFactorRepo } from "@/repositories/emission_factor.repo";

import { SemanticAccountMatcher } from "@/lib/utils/semantic_account_matcher";

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
      // ToDo: (20260521 - Tzuhan) refine types for voucherBase and esg data payload
      // const rawVendorTaxId = (voucherBase?.data as Record<string, unknown>)?.vendorTaxId || (voucherBase as Record<string, unknown>)?.vendorTaxId || (esg?.data as Record<string, unknown>)?.vendorTaxId || (esg as Record<string, unknown>)?.vendorTaxId;

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
          const vendorTaxIdStr = String(vdRecord.vendorTaxId || "");
          let linesToCreate: Prisma.VoucherLineCreateWithoutVoucherInput[] = [];

          const docType =
            (vdRecord.documentType as DocumentType) || DocumentType.OTHERS;
          let currentPaymentStatus: VoucherPaymentStatus =
            VoucherPaymentStatus.NOT_APPLICABLE;

          if (docType === DocumentType.ACCRUAL_NOTICE) {
            currentPaymentStatus = VoucherPaymentStatus.UNPAID;
          }

          let oldVoucherToClear: (Voucher & { lines: VoucherLine[] }) | null =
            null;
          let finalAiNote = vd.aiNote ?? "無 AI 分析備註";
          let hasSuspense = false;

          if (docType === DocumentType.PAYMENT_RECEIPT) {
            // Info: (20260520 - Tzuhan) 根據 ADR 001 絕對對應原則，尋找與原始憑證完全相同之金額
            const searchAmountStr = MoneyUtil.toDecimal(
              String(vdRecord.totalAmount || 0),
            ).toFixed(0);

            oldVoucherToClear = await ReconciliationService.findUnpaidVoucher(
              tx,
              vendorNameStr,
              searchAmountStr,
              accountBookId,
              vendorTaxIdStr,
            );
          }

          // Info: (20260520 - Tzuhan) 載入會計科目字典以供 SemanticAccountMatcher 使用
          const dictionary = (ACCOUNTS[
            (accountBook.country || "TW") as keyof typeof ACCOUNTS
          ] || ACCOUNTS["TW"]) as IAccount[];

          if (oldVoucherToClear) {
            const paymentAccountCode = SemanticAccountMatcher.match(
              "CASH_IN_BANK",
              dictionary,
              accountBook.country || "TW",
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

            // Info: (20260521 - Tzuhan) 由 VendorRegistry (Service) 負責業務邏輯，Repo 僅提供查出的 DB 資料
            const vendorMatch = VendorRegistry.match(
              vendorNameStr,
              docType,
              vendorTaxIdStr,
            );

            if (vendorMatch) {
              for (const rule of vendorMatch) {
                const amountDec = MoneyUtil.toDecimal(
                  String(vdRecord.totalAmount || 0),
                );
                const matchedAccountingCode = SemanticAccountMatcher.match(
                  rule.accountingCode,
                  dictionary,
                  accountBook.country || "TW",
                );
                linesToCreate.push({
                  accountingCode: matchedAccountingCode,
                  particular: `${getAccountName(accountBook.country || "TW", matchedAccountingCode)} - ${vendorNameStr}`,
                  amount: BigInt(amountDec.toFixed(0)),
                  isDebit: rule.isDebit,
                });
              }
            } else {
              for (const l of vd.lines || []) {
                const amountDec = MoneyUtil.toDecimal(String(l.amount || 0));
                let matchedAccountingCode = SemanticAccountMatcher.match(
                  l.accountingCode || "",
                  dictionary,
                  accountBook.country || "TW",
                );

                const isValidCode = dictionary.some(
                  (a) => a.code === matchedAccountingCode,
                );
                if (!isValidCode) {
                  hasSuspense = true;
                  matchedAccountingCode =
                    accountBook.bsSuspenseAccount || "1471";
                  finalAiNote =
                    `[系統稽核警告] 會計科目「${l.accountingCode}」無法對應至系統科目表，強制歸入懸記科目 (${matchedAccountingCode})。\n` +
                    finalAiNote;
                }

                linesToCreate.push({
                  accountingCode: matchedAccountingCode,
                  particular: l.particular || "",
                  amount: BigInt(amountDec.toFixed(0)),
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
          let finalIsVerified = isBalanced ? confidence > 85 : false;

          if (hasSuspense) {
            finalIsVerified = false;
          }

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
            // Info: (20260521 - Tzuhan) 職能分離：由 EmissionFactorRepo 負責 DB 查詢
            const matchedCoefId =
              await EmissionFactorRepo.findFallbackCoefficient(
                tx,
                fallbackTag,
                accountBookId,
              );

            if (matchedCoefId) {
              finalCoefficientId = matchedCoefId;
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
              // Info: (20260520 - Tzuhan) [AUDIT FIX] 量綱防呆檢查
              const getDimension = (u: string) => {
                if (["KG", "TONNE"].includes(u)) return "MASS";
                if (["LITER", "GALLON"].includes(u)) return "VOLUME";
                if (u === "KWH") return "ENERGY";
                if (u === "TWD") return "CURRENCY";
                return u;
              };

              const docUnit = ed.unit as string;
              const coefUnit = coefExists.unit as string;

              if (getDimension(docUnit) !== getDimension(coefUnit)) {
                isSuspense = true;
                finalCoefficientId = null;
                ed.aiNote =
                  (ed.aiNote || "") +
                  `\n[系統稽核警告] 憑證單位 (${docUnit}) 與係數庫單位 (${coefUnit}) 量綱不符，已阻斷跨量綱相乘，強制列入懸記。`;
              } else {
                emissionFactorValue = coefExists.emissionFactor;
                if (!coefExists.isVerified || isFallbackMatched) {
                  recordIsVerified = false; // Info: (20260513 - Tzuhan) Using unverified coefficient makes record unverified
                }
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
