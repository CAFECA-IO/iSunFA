import { API_ERRORS } from "@/lib/utils/error_dictionary";
import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { webAuthnRepo } from "@/repositories/webauthn.repo";
import { accountBookRepo } from "@/repositories/account_book.repo";
import { voucherRepo } from "@/repositories/voucher.repo";
import { auditLogRepo } from "@/repositories/audit_log.repo";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Prisma } from "@/generated/browser";
import { IVoucher, IVoucherLineUI, TradingType } from "@/interfaces/voucher";
import { getAccountByCode } from "@/lib/utils/account";
import { AIAnalysisStatus } from "@/constants/ai_analysis_status";
import { VerifyStatus } from "@/constants/verify_status";

/**
 * Info: (20260310 - Julian) 新增傳票：將 AI 解析出的傳票存入 DB
 * POST /api/v1/user/account_book/:account_book_id/voucher
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

    // Info: (20260310 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const body = await request.json();
    const { fileId } = body;

    // Info: (20260311 - Julian) 驗證 file 參數
    if (!fileId) {
      console.error("Missing file or file hash");
      return jsonFail({ code: "VA000099", message: "File is required", status: ApiCode.VALIDATION_ERROR });
    }

    // Info: (20260311 - Julian) 建立空白傳票
    const newVoucher = await voucherRepo.createVoucher({
      accountBookId: accountBook.id,
      fileId: fileId,
      userId: creator.id,
      tradingDate: new Date(),
      note: "",
      lines: { create: [] },
      confidence: 0,
      aiNote: "",
    });

    if (!newVoucher) {
      console.error("Voucher creation failed");
      return jsonFail(API_ERRORS.IS_DB_FAILED);
    }

    // Info: (20260311 - Julian) 新增 AuditLog
    await auditLogRepo.createAuditLog({
      userId: creator.id,
      dataType: "VOUCHER",
      dataId: newVoucher.id,
      accountBookId: accountBook.id,
      action: "CREATE",
    });

    return jsonOk({
      voucherId: newVoucher.id,
      data: newVoucher,
    });
  } catch (error) {
    console.error("Error creating voucher:", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}

/**
 * Info: (20260310 - Julian) 取得全部或指定範圍傳票
 * GET /api/v1/user/account_book/:account_book_id/voucher
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ account_book_id: string }> },
) {
  try {
    // Info: (20260310 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260310 - Julian) 取得建立者
    const author = await webAuthnRepo.findUserByAddress(sessionUser.address);

    if (!author) {
      console.error("Author not found");
      return jsonFail(API_ERRORS.NF_USER);
    }

    // Info: (20260310 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await accountBookRepo.getAccountBookById(accountBookId);

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(API_ERRORS.NF_ACCOUNT_BOOK);
    }

    const searchParams = request.nextUrl.searchParams;
    const verifyStatus = searchParams.get("verifyStatus");
    const keyWord = searchParams.get("keyWord");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = searchParams.get("page")
      ? parseInt(searchParams.get("page")!)
      : undefined;
    const pageSize = searchParams.get("pageSize")
      ? parseInt(searchParams.get("pageSize")!)
      : undefined;
    const orderByParams = searchParams.get("orderBy");
    const type = searchParams.get("type");
    const hideDeleted = searchParams.get("hideDeleted") === "true";
    const sorting = searchParams.get("sorting");

    const filteredConditions: Prisma.VoucherFindManyArgs = {
      where: { accountBookId: accountBook.id },
      // Info: (20260311 - Julian) 將關聯的 file, user, lines 一併取出
      include: { file: true, user: true, lines: true },
    };

    // Info: (20260311 - Julian) 關鍵字篩選：id / note / particular / accountingCode
    if (keyWord) {
      filteredConditions.where!.OR = [
        { id: { contains: keyWord } },
        { note: { contains: keyWord } },
        { lines: { some: { particular: { contains: keyWord } } } },
        { lines: { some: { accountingCode: { contains: keyWord } } } },
      ];
    }

    // Info: (20260324 - Julian) 建立審核狀態篩選
    if (verifyStatus) {
      filteredConditions.where!.isVerified =
        verifyStatus === VerifyStatus.VERIFIED;
    }

    // Info: (20260310 - Julian) 建立時間區間篩選
    if (startDate || endDate) {
      filteredConditions.where!.tradingDate = {};
      if (startDate) {
        filteredConditions.where!.tradingDate.gte = new Date(startDate);
      }
      if (endDate) {
        filteredConditions.where!.tradingDate.lte = new Date(endDate);
      }
    }

    // Info: (20260310 - Julian) 分頁
    if (page && pageSize) {
      filteredConditions.skip = (page - 1) * pageSize;
      filteredConditions.take = pageSize;
    }

    // Info: (20260310 - Julian) 排序 (保留欄位排序功能，但如果提供 sorting，則在最後再重新排序)
    if (orderByParams) {
      try {
        filteredConditions.orderBy = JSON.parse(orderByParams);
      } catch {
        console.warn("Invalid orderBy param format, ignoring");
      }
    }

    if (type && type !== "all") {
      filteredConditions.where!.tradingType = type.toUpperCase() as
        | "INCOME"
        | "OUTCOME"
        | "TRANSFER";
    }

    if (hideDeleted) {
      filteredConditions.where!.deletedAt = null;
    } else {
      // Info: (20260404 - Luphia) 預設列表顯示：未刪除、或是被軟刪除但距今小於 7 天內的傳票
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const whereInput = filteredConditions.where as Prisma.VoucherWhereInput;
      const andConditions = Array.isArray(whereInput.AND)
        ? whereInput.AND
        : whereInput.AND
          ? [whereInput.AND]
          : [];

      andConditions.push({
        OR: [{ deletedAt: null }, { deletedAt: { gte: sevenDaysAgo } }],
      });
      whereInput.AND = andConditions;
    }

    // Info: (20260310 - Julian) 取得日記帳列表
    const vouchers = await voucherRepo.getVouchers(filteredConditions);

    // Info: (20260311 - Julian) 組合成前端所需的格式
    const formattedVouchers: IVoucher[] = vouchers.map((v) => {
      // Info: (20260311 - Julian) 取得個別分錄
      const voucherLines = v.lines.filter((l) => l.voucherId === v.id);

      const voucherLineItems: IVoucherLineUI[] = voucherLines.map((l) => {
        return {
          id: l.id,
          accounting: getAccountByCode(l.accountingCode),
          particular: l.particular ?? "",
          amount: l.amount,
          isDebit: l.isDebit,
        };
      });

      // Info: (20260311 - Julian) 計算 debit 總和
      const totalAmount = voucherLines
        .filter((l) => l.isDebit)
        .reduce((sum, l) => sum + l.amount, 0);

      return {
        id: v.id,
        accountBookId: v.accountBookId,
        userId: v.userId,
        tradingDate: Math.floor(v.tradingDate.getTime() / 1000),
        tradingType: v.tradingType as TradingType,
        note: v.note ?? "",
        isDeleted: !!v.deletedAt,
        fileId: v.fileId ?? "",
        file: v.file
          ? {
            id: v.file.id,
            hash: v.file.hash,
            fileName: v.file.fileName || "Unknown",
          }
          : undefined,
        lineItems: {
          lines: voucherLineItems,
          totalAmount: totalAmount,
        },
        issuerName: v.user?.name ?? "",
        confidence: v.confidence,
        isVerified: v.isVerified,
        analysisStatus: v.analysisStatus as AIAnalysisStatus,
        aiNote: v.aiNote ?? "",
        journalId: v.journalId,
        esgRecordId: v.esgRecordId,
      };
    });

    // Info: (20260311 - Julian) 排序邏輯
    if (sorting) {
      formattedVouchers.sort((a, b) => {
        if (sorting === "date_desc") return b.tradingDate - a.tradingDate;
        if (sorting === "date_asc") return a.tradingDate - b.tradingDate;

        if (sorting.startsWith("debit_")) {
          const aDebit = a.lineItems.lines
            .filter((l) => l.isDebit)
            .reduce((sum, l) => sum + l.amount, 0);
          const bDebit = b.lineItems.lines
            .filter((l) => l.isDebit)
            .reduce((sum, l) => sum + l.amount, 0);
          return sorting === "debit_desc" ? bDebit - aDebit : aDebit - bDebit;
        }

        if (sorting.startsWith("credit_")) {
          const aCredit = a.lineItems.lines
            .filter((l) => !l.isDebit)
            .reduce((sum, l) => sum + l.amount, 0);
          const bCredit = b.lineItems.lines
            .filter((l) => !l.isDebit)
            .reduce((sum, l) => sum + l.amount, 0);
          return sorting === "credit_desc"
            ? bCredit - aCredit
            : aCredit - bCredit;
        }

        return 0;
      });
    }

    // Info: (20260324 - Julian) 總筆數
    const totalCount = await voucherRepo.countVouchers(
      filteredConditions.where || {},
    );

    return jsonOk({ data: formattedVouchers, total: totalCount });
  } catch (error) {
    console.error("Get vouchers failed", error);
    return jsonFail(API_ERRORS.IS_DB_FAILED);
  }
}
