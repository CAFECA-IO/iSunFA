import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { Prisma } from "@/generated/browser";
import {
  IVoucher,
  IVoucherLineUI,
  TradingType /* IParsedVoucherLine */,
} from "@/interfaces/voucher";
import { getAccountByCode } from "@/lib/utils/account";
// import { ChatService } from "@/services/chat.service";

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
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260310 - Julian) 取得建立者
    const creator = await prisma.user.findUnique({
      where: { address: sessionUser.address },
    });

    if (!creator) {
      console.error("Creator not found");
      return jsonFail(ApiCode.NOT_FOUND, "Creator not found");
    }

    // Info: (20260310 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const body = await request.json();
    const { file } = body;

    // Info: (20260311 - Julian) 驗證 file 參數
    if (!file || !file.hash) {
      console.error("Missing file or file hash");
      return jsonFail(ApiCode.VALIDATION_ERROR, "File is required");
    }

    // Info: (20260311 - Julian) 使用 AI 分析發票/憑證資料
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("Missing GEMINI_API_KEY");
      return jsonFail(
        ApiCode.INTERNAL_SERVER_ERROR,
        "Server configuration error",
      );
    }

    // ToDo: 建立分析 Voucher 的 Mission 和 Task
    // const chatService = new ChatService(apiKey);

    // const imagesForAi =
    //   file.base64 && file.mimeType
    //     ? [{ data: file.base64, mimeType: file.mimeType }]
    //     : [];

    // const { data: voucherData, error: aiError } = await chatService.analyzeVoucher(imagesForAi);

    // if (aiError || !voucherData) {
    //   return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, aiError || "Failed to parse voucher");
    // }

    // Info: (20260311 - Julian) 建立上傳檔案 DB 紀錄
    const dbFile = await prisma.file.create({
      data: {
        hash: file.hash,
        fileName: file.fileName,
      },
    });

    // const parsedLines: IParsedVoucherLine[] = Array.isArray(voucherData.lines) ? voucherData.lines : [];

    // Info: (20260311 - Julian) 將 AI 解析結果存入 DB
    // const newVoucher = await prisma.voucher.create({
    //   data: {
    //     accountBookId: accountBook.id,
    //     fileId: dbFile.id,
    //     userId: creator.id,
    //     tradingDate: voucherData.tradingDate ? new Date(voucherData.tradingDate) : new Date(),
    //     tradingType: voucherData.tradingType || "INCOME",
    //     note: voucherData.note || "",
    //     lines: {
    //       create: parsedLines.map((line) => ({
    //          accountingCode: line.accountingCode || "",
    //          particular: line.particular || "",
    //          amount: line.amount || 0,
    //          isDebit: line.isDebit ?? true,
    //       })),
    //     },
    //   },
    // });

    // Info: (20260311 - Julian) 建立空白傳票
    const newVoucher = await prisma.voucher.create({
      data: {
        accountBookId: accountBook.id,
        fileId: dbFile.id,
        userId: creator.id,
        tradingDate: new Date(),
        tradingType: "INCOME",
        note: "",
        lines: {
          create: [],
        },
      },
    });

    // Info: (20260311 - Julian) 新增 AuditLog
    await prisma.auditLog.create({
      data: {
        userId: creator.id,
        dataType: "VOUCHER",
        dataId: newVoucher.id,
        accountBookId: accountBook.id,
        action: "CREATE",
      },
    });

    return jsonOk({
      voucherId: newVoucher.id,
      data: newVoucher,
    });
  } catch (error) {
    console.error("Error creating voucher:", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Failed to create voucher");
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
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260310 - Julian) 取得建立者
    const author = await prisma.user.findUnique({
      where: { address: sessionUser.address },
    });

    if (!author) {
      console.error("Author not found");
      return jsonFail(ApiCode.NOT_FOUND, "Author not found");
    }

    // Info: (20260310 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    const searchParams = request.nextUrl.searchParams;
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
    }

    // Info: (20260310 - Julian) 取得日記帳列表
    const vouchers = (await prisma.voucher.findMany(
      filteredConditions,
    )) as Prisma.VoucherGetPayload<{
      include: { file: true; user: true; lines: true };
    }>[];

    // Info: (20260311 - Julian) 組合成前端所需的格式
    const result: IVoucher[] = vouchers.map((v) => {
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
        tradingDate: Math.floor(v.tradingDate.getTime() / 1000),
        tradingType: v.tradingType.toLowerCase() as TradingType,
        note: v.note ?? "",
        isDeleted: !!v.deletedAt,
        fileId: v.fileId ?? "",
        lineItems: {
          lines: voucherLineItems,
          totalAmount: totalAmount,
        },
        issuerName: v.user?.name ?? "",
      };
    });

    // Info: (20260311 - Julian) 排序邏輯
    if (sorting) {
      result.sort((a, b) => {
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

    return jsonOk({ result });
  } catch (error) {
    console.error("Get vouchers failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Get vouchers failed");
  }
}
