import { Prisma, Voucher, VoucherLine } from "@/generated";
import { VoucherPaymentStatus } from "@/constants/enums";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { AccountUtil } from "@/lib/utils/account_util";
import { SystemAccountNodes } from "@/constants/system_account_codes";

export class ReconciliationService {
  /**
   * Info: (20260520 - Tzuhan)
   * 尋找符合條件的未付款應付帳款傳票
   * @param tx Prisma Transaction Client
   * @param vendorName 廠商名稱（查詢 note 包含此名稱）
   * @param amount 應付帳款金額
   */
  static async findUnpaidVoucher(
    tx: Prisma.TransactionClient,
    vendorName: string,
    amount: string,
    accountBookId: string,
  ): Promise<(Voucher & { lines: VoucherLine[] }) | null> {
    if (!vendorName || vendorName.trim() === "") {
      return null;
    }

    // Info: (20260520 - Tzuhan) 找出所有屬於負債類的會計科目代碼
    const liabilityCodes = TW_ACCOUNTS.filter((acc) =>
      AccountUtil.isDescendantOf(
        acc.code,
        SystemAccountNodes.LIABILITIES_ROOT,
        TW_ACCOUNTS,
      ),
    ).map((acc) => acc.code);

    const targetAmount = BigInt(amount);

    const voucher = await tx.voucher.findFirst({
      where: {
        accountBookId,
        note: {
          contains: vendorName,
        },
        paymentStatus: VoucherPaymentStatus.UNPAID,
        lines: {
          some: {
            isDebit: false, // Info: (20260520 - Tzuhan) 貸方
            accountingCode: {
              in: liabilityCodes,
            },
            amount: targetAmount,
          },
        },
      },
      include: {
        lines: true,
      },
    });

    return voucher;
  }

  /**
   * Info: (20260520 - Tzuhan)
   * 根據 unpaidVoucher 產生自動沖銷的新分錄陣列
   * @param unpaidVoucher 未付款之傳票
   * @param paymentAccountCode 付款使用的會計科目（例如 1103 銀行存款）
   */
  static generateClearingLines(
    unpaidVoucher: Voucher & { lines: VoucherLine[] },
    paymentAccountCode: string,
  ): Prisma.VoucherLineCreateWithoutVoucherInput[] {
    const liabilityCodes = TW_ACCOUNTS.filter((acc) =>
      AccountUtil.isDescendantOf(
        acc.code,
        SystemAccountNodes.LIABILITIES_ROOT,
        TW_ACCOUNTS,
      ),
    ).map((acc) => acc.code);

    // Info: (20260520 - Tzuhan) 找出屬於負債類的原始明細
    const liabilityLine = unpaidVoucher.lines.find(
      (line) => !line.isDebit && liabilityCodes.includes(line.accountingCode),
    );

    if (!liabilityLine) {
      throw new Error("Cannot find valid liability line for clearing.");
    }

    // Info: (20260520 - Tzuhan) 產生沖銷分錄
    return [
      {
        accountingCode: liabilityLine.accountingCode,
        isDebit: true, // Info: (20260520 - Tzuhan) 借方：沖銷負債
        amount: liabilityLine.amount,
      },
      {
        accountingCode: paymentAccountCode,
        isDebit: false, // Info: (20260520 - Tzuhan) 貸方：現金流出
        amount: liabilityLine.amount,
      },
    ];
  }
}
