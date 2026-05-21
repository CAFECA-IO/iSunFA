import { Prisma, Voucher, VoucherLine } from "@/generated";
import { VoucherPaymentStatus } from "@/constants/enums";
import { TW_ACCOUNTS } from "@/constants/accounts/tw";
import { AccountUtil } from "@/lib/utils/account_util";
import { SystemAccountNodes } from "@/constants/system_account_codes";

/**
 * Info: (20260521 - Tzuhan) [Auto-Reconciliation Service]
 * 嚴禁於單一 Document Sync Pipeline 中進行「同步阻斷呼叫 (Synchronous Blocking Call)」。
 * 為了解決平行 Executor 帶來的時序悖論 (Temporal Paradox) 與資料庫死鎖 (Deadlocks)，
 * 自動沖銷必須由「背景批次任務 (Background Batch)」或「事件驅動 (Event-Driven Hook)」觸發。
 * 採行池化配對 (Pool Matching)：拉出特定廠商所有憑證，依 tradingDate 重新排序後雙向扣合。
 */
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
    vendorTaxId?: string,
  ): Promise<(Voucher & { lines: VoucherLine[] }) | null> {
    if ((!vendorName || vendorName.trim() === "") && !vendorTaxId) {
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

    const searchConditions: Prisma.VoucherWhereInput[] = [];
    if (vendorTaxId) {
      searchConditions.push({ vendorTaxId });
    } else if (vendorName && vendorName.trim() !== "") {
      searchConditions.push({ note: { contains: vendorName } });
      searchConditions.push({
        lines: { some: { particular: { contains: vendorName } } },
      });
    }

    const voucher = await tx.voucher.findFirst({
      where: {
        accountBookId,
        OR: searchConditions.length > 0 ? searchConditions : undefined,
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
      orderBy: {
        tradingDate: "asc", // Info: (20260520 - Tzuhan) FIFO 先進先出沖銷
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

  /**
   * Info: (20260521 - Tzuhan) [Eventual Consistency Pool Matching]
   * 批次沖銷單一廠商的應付帳款與付款收據。
   * 此方法應在背景排程 (CronJob) 或 Event Hook 中被觸發，避免 Document Sync 產生 Race Condition。
   * @param tx Prisma Transaction Client
   * @param accountBookId 帳本 ID
   * @param vendorTaxId 廠商統編
   */
  static async batchReconcileVendor(
    tx: Prisma.TransactionClient,
    accountBookId: string,
    vendorTaxId: string,
  ): Promise<void> {
    // TODO: 1. 拉出此廠商所有的 UNPAID 傳票 (應付帳款)
    // TODO: 2. 拉出此廠商所有的 UNRECONCILED (或無 clearedByVoucherId) 且為 PAID/NOT_APPLICABLE 的傳票 (付款收據)
    // TODO: 3. 雙方合併並按照 tradingDate ASC 進行排序
    // TODO: 4. 透過雙指標 (Two-Pointer) 或金額匹配進行 In-Memory Pool Matching
    // TODO: 5. 批次寫入狀態更新與 clearedByVoucherId 綁定
    console.log(
      `[ReconciliationService] Batch reconciling vendor ${vendorTaxId} in book ${accountBookId}`,
    );
  }
}
