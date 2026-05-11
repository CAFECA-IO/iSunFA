import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
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
import { AuthenticationJSON } from "@passwordless-id/webauthn/dist/esm/types";
import { paymentRepo } from "@/repositories/payment.repo";
import { ORDER_STATUS } from "@/constants/status";
import { decodeFunctionData, keccak256, stringToBytes, parseAbi } from "viem";
import { AppError } from "@/lib/utils/error";
import { getPendingOrder } from "@/services/order.service";
import { publicClient } from "@/lib/viem_public";
import { ABIS } from "@/config/contracts";
import { webAuthnService } from "@/services/webauthn.service";
import {
  IAIAnalysisOrderData,
  IAIAnalysisOrderFile,
} from "@/interfaces/payment";

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
      return jsonFail({
        code: "VA000099",
        message: "File is required",
        status: ApiCode.VALIDATION_ERROR,
      });
    }

    // Info: (20260413 - Luphia) Verify Payment Order before doing AI processing
    if (!authentication || !authentication.orderId) {
      return jsonFail(API_ERRORS.VL_INVALID_ID);
    }

    const orderId = authentication.orderId;
    const authWithTx = authentication as AuthenticationJSON & {
      transactionHash?: string;
    };
    const txHash = authWithTx.transactionHash;

    try {
      if (txHash) {
        const tx = await publicClient.getTransaction({
          hash: txHash as `0x${string}`,
        });
        if (!tx) {
          throw new Error("Transaction not found");
        }

        let foundUserOp = false;
        let verifiedHash = false;

        try {
          const { args } = decodeFunctionData({
            abi: ABIS.ENTRY_POINT,
            data: tx.input,
          });
          const ops = args[0] as unknown as {
            sender: string;
            callData: `0x${string}`;
          }[];

          for (const op of ops) {
            if (op.sender.toLowerCase() === sessionUser.address.toLowerCase()) {
              foundUserOp = true;
              const executeAbi = parseAbi([
                "function execute(address, uint256, bytes) external",
              ]);

              const { args: executeArgs } = decodeFunctionData({
                abi: executeAbi,
                data: op.callData,
              });

              const innerCallData = executeArgs[2];

              const orderHash = keccak256(stringToBytes(orderId));
              const hashHex = orderHash.slice(2).toLowerCase();
              if (innerCallData.toLowerCase().endsWith(hashHex)) {
                verifiedHash = true;
              }
              break;
            }
          }
        } catch {
          throw new Error("Invalid transaction structure");
        }

        if (!foundUserOp) {
          throw new Error(
            "No UserOperation found for this user in the transaction",
          );
        }
        if (!verifiedHash) {
          throw new Error("Transaction is not bound to this Order ID");
        }

        /**
         * Info: (20260418 - Luphia)
         * Removed synchronous `waitForTransactionReceipt` to prevent 45s API timeout.
         * We trust the transaction has been dispatched cleanly by blockchain_payment.
         * The background worker or asynchronous order completion handles failures.
         * Wait to complete order because multiple AI scans share the same order, so only complete it once if pending!
         */
        const existingOrder = await getPendingOrder(orderId, creator.id).catch(
          () => null,
        );
        if (existingOrder && existingOrder.status === "PENDING") {
          // Info: (20260420 - Luphia) Mark as PAID so MissionIssuer picks it up
          await paymentRepo.updateOrderStatus(orderId, ORDER_STATUS.PAID, {
            transactionHash: txHash,
          });
        }
      } else {
        const order = await getPendingOrder(orderId, creator.id).catch(
          () => null,
        );

        if (order && order.status === "PENDING") {
          await webAuthnService.verifySignature(
            sessionUser.address,
            authentication,
            order.challenge,
          );

          // Info: (20260420 - Luphia) Mark as PAID so MissionIssuer picks it up
          await paymentRepo.updateOrderStatus(orderId, ORDER_STATUS.PAID, {
            signature: JSON.stringify(authentication),
          });
        }
      }
    } catch (error) {
      if (error instanceof AppError) {
        return jsonFail(API_ERRORS.IS_UNKNOWN);
      }
      return jsonFail({
        code: "UN000099",
        message: String(
          `Verification failed: ${(error as Error).message}`,
        ).slice(0, 30),
        status: ApiCode.UNAUTHORIZED,
      });
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
          amount: 0,
          unit: "",
          emissions: 0,
          dqiScore: 0,
          aiNote: "",
          confidence: 0,
          isVerified: false,
        });

        if (!newRecord) {
          throw new Error("ESG record creation failed");
        }

        // 收集 AuditLog，移到迴圈外統一執行 (效能優化)
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
    return jsonFail({
      code: "IN000099",
      message: "Failed to create AI analysis",
      status: ApiCode.INTERNAL_SERVER_ERROR,
    });
  }
}
