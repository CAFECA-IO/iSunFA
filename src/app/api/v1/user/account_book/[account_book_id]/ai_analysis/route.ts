import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { fileRepo } from "@/repositories/file.repo";
import { journalRepo } from "@/repositories/journal.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { esgRepo } from "@/repositories/esg.repo";
import {
  auditLogRepo,
  ICreateAuditLogInput,
} from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { paymentRepo } from "@/repositories/payment.repo";
import { AppError } from "@/lib/utils/error";
import { getPaidOrder } from "@/services/order.service";
import {
  IAIAnalysisOrderData,
  IAIAnalysisOrderFile,
} from "@/interfaces/payment";
import { MeasurementUnit } from "@/constants/enums";
import { Prisma } from "@/generated";

/**
 * Info: (20260318 - Julian) AI 分析：生成日記帳、傳票、碳排查
 * POST /api/v1/user/account_book/:account_book_id/ai_analysis
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260310 - Julian) 取得建立者
    const creator = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260318 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const body = await request.json();
    const { files, authentication } = body;

    // Info: (20260318 - Julian) 驗證 file 參數
    if (!files || files.length === 0) {
      console.error("Missing file or file hash");
      return jsonFail(API_ERRORS.VA_FILE_IS_REQUIRED);
    }

    // Info: (20260413 - Luphia) Verify Payment Order before doing AI processing
    if (!authentication || !authentication.orderId) {
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    const orderId = authentication.orderId;

    /**
     * Info: (20261015 - Luphia) 付款確認改看訂單狀態（區塊鏈退役）。
     *
     * 原本這裡解碼鏈上交易確認綁定，再把 PENDING 標成 PAID 讓 MissionIssuer 接手；
     * 沒帶 txHash 時「驗訂單 challenge 的簽章就標成 PAID」——一點都沒扣；
     * 訂單不是 PENDING 時則什麼都不檢查就往下做。現在付款只會經過點數帳本
     * （point_payment）或團隊額度（team_quota_payment），兩者都在付款當下推進到
     * 付款後狀態——這裡只認那些狀態，也不再改寫訂單。
     */
    try {
      await getPaidOrder(orderId, creator.id);
    } catch (error) {
      if (error instanceof AppError) {
        return jsonFail({
          code: error.apiCode,
          message: error.message,
          status: error.code,
        });
      }
      return jsonFail(API_ERRORS.IS_UNKNOWN);
    }

    const auditLogsToCreate: ICreateAuditLogInput[] = [];

    const results = await Promise.all(
      files.map(async (fileItem: { hash: string; file: { name: string } }) => {
        // Info: (20260318 - Julian) 將 file 存入 DB
        const uploadedFile = await fileRepo.createFile({
          hash: fileItem.hash,
          fileName: fileItem.file.name,
        });

        if (!uploadedFile) {
          throw new Error("File upload failed");
        }

        // Info: (20260318 - Julian) 建立日記帳
        const newJournal = await journalRepo.createJournal({
          accountBookId: accountBook.id,
          fileId: uploadedFile.id,
          text: "",
          tradingDate: new Date(),
          isVerified: false,
          aiNote: "",
        });

        if (!newJournal) {
          throw new Error("Journal creation failed");
        }

        // Info: (20260318 - Julian) 建立空白傳票
        const newVoucher = await voucherRepo.createVoucher({
          accountBookId: accountBook.id,
          fileId: uploadedFile.id,
          userId: creator.id,
          tradingDate: new Date(),
          note: "",
          lines: { create: [] },
          aiNote: "",
          confidence: 0,
          isVerified: false,
        });

        if (!newVoucher) {
          throw new Error("Voucher creation failed");
        }

        // Info: (20260318 - Julian) 建立空白 ESG 紀錄
        const newRecord = await esgRepo.createEsgRecord({
          accountBookId: accountBook.id,
          userId: creator.id,
          fileId: uploadedFile.id,
          createdAt: new Date(),
          updatedAt: new Date(),
          tradingDate: new Date(),
          activityType: "",
          vendor: "",
          amount: new Prisma.Decimal(0),
          unit: MeasurementUnit.PIECE,
          emissions: new Prisma.Decimal(0),
          dqiScore: new Prisma.Decimal(0),
          aiNote: "",
          confidence: 0,
          isVerified: false,
        });

        if (!newRecord) {
          throw new Error("ESG record creation failed");
        }

        // Info: (20260511 - Julian) 收集 AuditLog，移到迴圈外統一執行 (效能優化)
        auditLogsToCreate.push(
          {
            userId: creator.id,
            dataType: "JOURNAL",
            dataId: newJournal.newId,
            accountBookId: accountBook.id,
            action: "CREATE",
          },
          {
            userId: creator.id,
            dataType: "VOUCHER",
            dataId: newVoucher.newId,
            accountBookId: accountBook.id,
            action: "CREATE",
          },
          {
            userId: creator.id,
            dataType: "ESG_RECORD",
            dataId: newRecord.newId,
            accountBookId: accountBook.id,
            action: "CREATE",
          },
        );

        return {
          hash: fileItem.hash,
          journalId: newJournal.newId,
          voucherId: newVoucher.newId,
          esgRecordId: newRecord.newId,
          recordId: newRecord.newId,
        };
      }),
    );

    // Info: (20260511 - Julian) 批量寫入 AuditLog，降低 DB query 數量
    if (auditLogsToCreate.length > 0) {
      await auditLogRepo.createManyAuditLogs(auditLogsToCreate);
    }

    // Info: (20260511 - Julian) 更新 Order，加入產生的 journalId、voucherId、esgRecordId
    const orderToUpdate = await paymentRepo.getOrderById(orderId);
    if (orderToUpdate) {
      const orderDataObj =
        (orderToUpdate.data as Record<string, unknown>) || {};
      const innerData =
        (orderDataObj.data as Record<string, unknown>) || orderDataObj;
      const filesData = innerData.files as IAIAnalysisOrderFile[] | undefined;

      if (Array.isArray(filesData)) {
        const updatedFilesData: IAIAnalysisOrderFile[] = filesData.map((f) => {
          const matchingResult = results.find((r) => r.hash === f.hash);
          if (matchingResult) {
            return {
              ...f,
              journalId: matchingResult.journalId,
              voucherId: matchingResult.voucherId,
              esgRecordId: matchingResult.esgRecordId,
            };
          }
          return f;
        });

        const updatedData: IAIAnalysisOrderData = { ...orderDataObj };
        if (orderDataObj.data) {
          updatedData.data = { ...innerData, files: updatedFilesData };
        } else {
          updatedData.files = updatedFilesData;
        }

        await paymentRepo.updateOrderData(orderId, updatedData);
      }
    }

    return jsonOk({ results });
  } catch (error) {
    console.error("Error creating AI analysis:", error);
    return jsonFail(API_ERRORS.IN_FAILED_TO_CREATE_AI_ANALYSIS);
  }
}
