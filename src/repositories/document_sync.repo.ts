import { prisma } from "@/lib/prisma";
import {
  VoucherTradingType,
  AIAnalysisStatus,
  Prisma,
  EsgScope,
  EsgIntensity,
  Voucher,
  VoucherLine,
  Coefficient,
} from "@/generated";
import {
  EsgGenerationSource,
  JournalGenerationSource,
  DocumentType,
  VoucherPaymentStatus,
  CountryCode,
  MeasurementUnit,
  verifyDimensionalConsistency,
} from "@/constants/enums";
import { ISyncDocumentResultParams } from "@/skills/utils/document_parser_db_sync";
import { ACCOUNTS, IAccount } from "@/constants/accounts";
import { ReconciliationService } from "@/services/reconciliation.service";
import { MoneyUtil } from "@/lib/utils/money";
import { SemanticAccountMatcher } from "@/lib/utils/semantic_account_matcher";
import { ALL_COEFFICIENTS } from "@/constants/true_esg_coefficients";
import { MOCK_EEIO_COEFFICIENTS } from "@/constants/mock_eeio_coefficients";
import { CoaVectorSearchService } from "@/services/coa_vector_search.service";

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
            (accountBook.country || CountryCode.TW) as keyof typeof ACCOUNTS
          ] || ACCOUNTS[CountryCode.TW]) as IAccount[];

          if (oldVoucherToClear) {
            const paymentAccountCode = SemanticAccountMatcher.match(
              "CASH_IN_BANK",
              dictionary,
              accountBook.country || CountryCode.TW,
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

            for (const l of vd.lines || []) {
              const amountDec = MoneyUtil.toDecimal(String(l.amount || 0));

              // Info: (20260522 - Tzuhan) [ADR 004 Enforcement] 廢除 Turn 2 盲目信任，改由後端嚴格 Bigram 閥值懸記
              const particularStr = (l.particular as string) || "";
              let matchResult = CoaVectorSearchService.matchWithScore(
                particularStr,
                (accountBook.country as CountryCode) || CountryCode.TW,
              );

              // Info: (20260522 - Tzuhan) Bypass Bigram if AI provided a high-confidence semantic category
              if (l.semanticCategory && l.semanticCategory !== "UNKNOWN") {
                const semanticCode = SemanticAccountMatcher.match(
                  l.semanticCategory as string,
                  dictionary,
                  (accountBook.country as CountryCode) || CountryCode.TW,
                );
                if (semanticCode !== "UNKNOWN") {
                  matchResult = { code: semanticCode, score: 1.0 };
                }
              }

              let matchedAccountingCode = matchResult.code;
              let isValidCode = dictionary.some(
                (a) => a.code === matchedAccountingCode,
              );

              let lineIsVerified = false;
              let lineGenSource: JournalGenerationSource =
                JournalGenerationSource.SYSTEM_SUSPENSE;

              if (isValidCode && matchResult.score > 0.85) {
                lineIsVerified = true;
                lineGenSource = JournalGenerationSource.SYSTEM_DETERMINISTIC;
              } else {
                isValidCode = false; // Info: (20260522 - Tzuhan) Force suspense
              }

              if (!isValidCode || matchedAccountingCode === "UNKNOWN") {
                hasSuspense = true;
                lineIsVerified = false;
                lineGenSource = JournalGenerationSource.SYSTEM_SUSPENSE;

                const isPL = docType === DocumentType.ACCRUAL_NOTICE;

                if (isPL) {
                  if (l.isDebit) {
                    matchedAccountingCode = "6288"; // Info: (20260522 - Tzuhan) 固定退回 PL 隔離區
                    finalAiNote =
                      `[系統稽核警告] 摘要「${l.particular}」無法對應，依據性質強制隔離至 PL 借方隔離區 (${matchedAccountingCode})。\n` +
                      finalAiNote;
                  } else {
                    matchedAccountingCode = "7590";
                    finalAiNote =
                      `[系統稽核警告] 摘要「${l.particular}」無法對應，依據性質強制隔離至 PL 貸方隔離區 (${matchedAccountingCode})。\n` +
                      finalAiNote;
                  }
                } else {
                  if (l.isDebit) {
                    matchedAccountingCode = "1471"; // Info: (20260522 - Tzuhan) 固定退回 BS 隔離區
                    finalAiNote =
                      `[系統稽核警告] 摘要「${l.particular}」無法對應，依據性質強制隔離至 BS 借方隔離區 (${matchedAccountingCode})。\n` +
                      finalAiNote;
                  } else {
                    matchedAccountingCode = "2330"; // Info: (20260522 - Tzuhan) 固定退回 BS 隔離區
                    finalAiNote =
                      `[系統稽核警告] 摘要「${l.particular}」無法對應，依據性質強制隔離至 BS 貸方隔離區 (${matchedAccountingCode})。\n` +
                      finalAiNote;
                  }
                }
              }

              linesToCreate.push({
                accountingCode: matchedAccountingCode,
                particular: l.particular || "",
                amount: BigInt(amountDec.toFixed(0)),
                isDebit: l.isDebit === true,
                isVerified: lineIsVerified,
                generationSource: lineGenSource,
              });
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
          // Info: (20260522 - Tzuhan) IDocNode 介面已正式擴充 generationSource，嚴禁使用 any
          const ed = esg.data || esg;
          const confidence = parseInt(String(ed.confidence)) || 0;
          let finalCoefficientId = ed.coefficientId || null;
          let finalEmissionSourceId = ed.emissionSourceId || null;

          // Info: (20260522 - Tzuhan) ADR 006: 廢除 Stage 1 靜態廠商攔截與 Stage 2 大類粗估。
          // 系統全面信任 Two-Turn RAG 前端傳遞的 coefficientId，僅在寫入前進行物理量綱防呆。

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
          // Info: (20260522 - Tzuhan) 直接採用 Two-Turn RAG 在後端 TS 算好的高精度碳排量
          let calculatedEmissions = new Prisma.Decimal(
            String(ed.emissions) || "0",
          );
          let isSuspense = false;
          let recordIsVerified = confidence > 85;

          if (finalCoefficientId) {
            let coefExists: Coefficient | null | undefined =
              await tx.coefficient.findUnique({
                where: { id: finalCoefficientId },
              });

            let isStaticMock = false;

            if (!coefExists) {
              coefExists = [
                ...ALL_COEFFICIENTS,
                ...MOCK_EEIO_COEFFICIENTS,
              ].find(
                (c) => c.id === finalCoefficientId,
              ) as unknown as Coefficient;

              if (coefExists) {
                isStaticMock = true;
              }
            }

            if (coefExists) {
              const docUnit = ed.unit as MeasurementUnit;
              const coefUnit = coefExists.unit as MeasurementUnit;

              if (!verifyDimensionalConsistency(docUnit, coefUnit)) {
                isSuspense = true;
                finalCoefficientId = null;
                ed.aiNote =
                  (ed.aiNote || "") +
                  `\n[系統稽核警告] 憑證單位 (${docUnit}) 與係數庫單位 (${coefUnit}) 量綱不符，已阻斷寫入，強制列入懸記。`;
              } else {
                if (!coefExists.isVerified) {
                  recordIsVerified = false;
                }
                if (
                  coefExists.source ===
                  "Internal_Proxy_Estimation_Based_On_Spend"
                ) {
                  recordIsVerified = false;
                }

                if (isStaticMock) {
                  // Info: (20260522 - Tzuhan) [AUDIT FIX] 把靜態過渡期 mock 係數直接寫入資料庫，以符合 Foreign Key 約束
                  await tx.coefficient.upsert({
                    where: { id: coefExists.id },
                    create: {
                      id: coefExists.id,
                      name: coefExists.name,
                      description: coefExists.description || "",
                      unit: coefExists.unit,
                      emissionFactor: coefExists.emissionFactor,
                      source: coefExists.source,
                      category: coefExists.category || "STANDARD",
                      isVerified: true,
                    },
                    update: {},
                  });

                  ed.aiNote =
                    (ed.aiNote || "") +
                    `\n[系統通知] 該碳排係數為過渡期靜態模擬 (${coefExists.id})，系統已自動將其補登至資料庫主檔，並完成精確碳排計算寫入。`;
                }
              }
            } else {
              isSuspense = true;
              finalCoefficientId = null;
            }
          } else {
            // Info: (20260522 - Tzuhan) 若 RAG 未能找到 coefficientId (例如純付款收據或真查無係數)，依舊懸記
            if (
              ed.generationSource !== EsgGenerationSource.SYSTEM_DETERMINISTIC
            ) {
              isSuspense = true;
            }
          }

          let aiNote = ed.aiNote ?? "無 AI 分析備註";

          if (isSuspense) {
            calculatedEmissions = new Prisma.Decimal(0);
            recordIsVerified = false;
            if (
              ed.generationSource !== EsgGenerationSource.SYSTEM_DETERMINISTIC
            ) {
              aiNote =
                "[系統稽核警告] 缺乏有效對應的碳排係數主檔，系統已凍結計算並列入懸記。\n" +
                aiNote;
            }
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
            generationSource:
              ed.generationSource || EsgGenerationSource.AI_GENERATED,
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
