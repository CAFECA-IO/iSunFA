import { NextRequest } from "next/server";
import { jsonOk, jsonFail } from "@/lib/utils/response";
import { ApiCode } from "@/lib/utils/status";
import { prisma } from "@/lib/prisma";
import { getIdentityFromDeWT } from "@/lib/auth/dewt";
import { IVoucher, IVoucherLineUI, TradingType } from "@/interfaces/voucher";
import { getAccountByCode } from "@/lib/utils/account";

/**
 * Info: (20260311 - Julian) 取得傳票
 * GET /api/v1/user/account_book/:account_book_id/voucher/:voucher_id
 */
export async function GET(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; voucher_id: string }> },
) {
  try {
    // Info: (20260311 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260311 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260311 - Julian) 取得傳票
    const { voucher_id: voucherId } = await params;
    if (!voucherId) {
      console.error("Missing voucherId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "VoucherId is required");
    }

    const voucher = await prisma.voucher.findUnique({
      where: { id: voucherId },
      // Info: (20260311 - Julian) 將關聯的 file, user, lines 一併取出
      include: { file: true, user: true, lines: true },
    });

    if (!voucher) {
      console.error("Voucher not found");
      return jsonFail(ApiCode.NOT_FOUND, "Voucher not found");
    }

    //
    const lineItems: IVoucherLineUI[] = voucher.lines.map((l) => {
      return {
        id: l.id,
        accounting: getAccountByCode(l.accountingCode),
        particular: l.particular ?? "",
        amount: l.amount,
        isDebit: l.isDebit,
      };
    });

    // Info: (20260311 - Julian) 計算 debit 總和
    const lineTotalAmount = voucher.lines
      .filter((l) => l.isDebit)
      .reduce((sum, l) => sum + l.amount, 0);

    const result: IVoucher = {
      id: voucher.id,
      tradingDate: Math.floor(voucher.tradingDate.getTime() / 1000),
      tradingType: voucher.tradingType as TradingType,
      note: voucher.note ?? "",
      isDeleted: !!voucher.deletedAt,
      fileId: voucher.fileId ?? "",
      //   file:voucher.file,
      lineItems: {
        lines: lineItems,
        totalAmount: lineTotalAmount,
      },
      issuerName: voucher.user?.name ?? "",
    };

    return jsonOk({ result });
  } catch (error) {
    console.error("Get voucher failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Get voucher failed");
  }
}

/**
 * Info: (20260304 - Julian) 編輯傳票
 * PUT /api/v1/user/account_book/:account_book_id/voucher/:voucher_id
 */
export async function PUT(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ account_book_id: string; voucher_id: string }> },
) {
  try {
    // Info: (20260304 - Julian) Verify Token & Get User
    const authHeader = request.headers.get("Authorization");
    const sessionUser = await getIdentityFromDeWT(authHeader);

    if (!sessionUser) {
      console.error("User not found");
      return jsonFail(ApiCode.NOT_FOUND, "User not found");
    }

    // Info: (20260306 - Julian) 驗證更新人員
    const updater = await prisma.user.findUnique({
      where: { address: sessionUser.address },
    });

    if (!updater) {
      console.error("Updater not found");
      return jsonFail(ApiCode.NOT_FOUND, "Updater not found");
    }

    // Info: (20260309 - Julian) 取得帳簿
    const { account_book_id: accountBookId } = await params;
    const accountBook = await prisma.accountBook.findUnique({
      where: { id: accountBookId },
    });

    if (!accountBook) {
      console.error("Accountbook not found");
      return jsonFail(ApiCode.NOT_FOUND, "Accountbook not found");
    }

    // Info: (20260309 - Julian) 取得傳票
    const { voucher_id: voucherId } = await params;
    if (!voucherId) {
      console.error("Missing voucherId");
      return jsonFail(ApiCode.VALIDATION_ERROR, "VoucherId is required");
    }

    // Info: (20260311 - Julian) 取得更新的內容
    const body = await request.json();
    const { inputDate, voucherType, note } = body;
    const rows = body.rows as IVoucherLineUI[];

    if (!inputDate || !voucherType || !rows || !Array.isArray(rows)) {
      console.error("Invalid input data");
      return jsonFail(ApiCode.VALIDATION_ERROR, "Invalid input data");
    }

    // Info: (20260304 - Julian) Update voucher
    const updatedVoucher = await prisma.voucher.update({
      where: { id: voucherId },
      data: {
        tradingDate: new Date(inputDate * 1000),
        tradingType: voucherType.toUpperCase(),
        note: note || "",
        lines: {
          deleteMany: {},
          create: rows.map((row) => ({
            accountingCode: row.accounting?.code || "",
            particular: row.particular || "",
            amount: row.amount || 0,
            isDebit: row.isDebit ?? false,
          })),
        },
      },
      include: { lines: true, user: true, file: true },
    });

    if (!updatedVoucher) {
      console.error("Voucher update failed");
      return jsonFail(ApiCode.NOT_FOUND, "Voucher update failed");
    }

    // Info: (20260311 - Julian) 新增 log
    await prisma.auditLog.create({
      data: {
        userId: updater.id,
        dataType: "VOUCHER",
        dataId: updatedVoucher.id,
        accountBookId: accountBook.id,
        action: "UPDATE",
      },
    });

    return jsonOk({ voucher: updatedVoucher });
  } catch (error) {
    console.error("Put voucher failed", error);
    return jsonFail(ApiCode.INTERNAL_SERVER_ERROR, "Put voucher failed");
  }
}
