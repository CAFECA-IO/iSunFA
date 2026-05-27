import { prisma } from "@/lib/prisma";
import { getCrossExchangeRateStatic } from "@/skills/utils/exchange_rate_helper";
import { MoneyUtil } from "@/lib/utils/money";
import dayjs from "dayjs";

export class FxRevaluationWorkerService {
  /**
   * Info: (20260527 - Tzuhan) [AUDIT] 月結外幣重評價 (Month-end FX Revaluation)
   * 由於資料庫 Schema 未紀錄原外幣金額 (foreignAmount)，
   * 我們利用決定論反推法 (Deterministic Reverse-engineering)：
   * 1. 抓出所有含有外幣標記的應付/應收帳款分錄
   * 2. 利用憑證的 tradingDate 抓取「歷史匯率」，除以 TWD 本位幣得出「精準外幣餘額」
   * 3. 取得「期末收盤匯率」，重新相乘計算「期末 TWD 餘額」
   * 4. 兩者相減，即為未實現兌換損益 (Unrealized FX Gain/Loss)
   */
  public async processMonthEndRevaluation(
    targetYearMonth: string, // e.g., "2026-05"
    accountBookId: string
  ) {
    console.log(`[FxRevaluationWorker] Starting FX revaluation for ${targetYearMonth}`);
    const monthEnd = dayjs(targetYearMonth).endOf("month").toDate();

    const book = await prisma.accountBook.findUnique({
      where: { id: accountBookId }
    });
    if (!book) throw new Error("AccountBook not found");
    const baseCurrency = book.currency;

    // 1. 抓取所有外幣憑證 (currency != baseCurrency)
    const foreignVouchers = await prisma.voucher.findMany({
      where: {
        accountBookId,
        currency: { not: baseCurrency },
        tradingDate: { lte: monthEnd },
        deletedAt: null
      },
      include: { lines: true }
    });

    const adjustments: { voucherId: string, diffStr: string, isLoss: boolean }[] = [];

    for (const voucher of foreignVouchers) {
      const foreignCurrency = voucher.currency;
      const historicalRate = getCrossExchangeRateStatic(foreignCurrency, baseCurrency, voucher.tradingDate);
      const closingRate = getCrossExchangeRateStatic(foreignCurrency, baseCurrency, monthEnd);

      if (historicalRate === closingRate) continue;

      // 尋找 AP/AR 分錄
      for (const line of voucher.lines) {
        if (
          line.accountingCode.startsWith("214") || // Accounts Payable (e.g., 2140)
          line.accountingCode.startsWith("117") || // Accounts Receivable (e.g., 1170)
          line.accountingCode.startsWith("119") // Other Receivables
        ) {
          // 決定論反推：外幣餘額 = TWD餘額 / 歷史匯率
          const twdAmountStr = line.amount.toString();
          const foreignAmountStr = MoneyUtil.toDecimal(twdAmountStr).dividedBy(historicalRate).toString();

          // 期末 TWD 餘額 = 外幣餘額 * 期末匯率
          const revaluedTwdStr = MoneyUtil.toDecimal(foreignAmountStr).times(closingRate).round().toString();

          const diffStr = MoneyUtil.subtract(revaluedTwdStr, twdAmountStr);
          if (diffStr === "0") continue;

          // 判斷損失或利益
          // 對於負債(AP)，匯率上升 -> TWD變多 -> 損失 (Loss)
          // 對於資產(AR)，匯率上升 -> TWD變多 -> 利益 (Gain)
          const isLiability = !line.isDebit; // 通常 AP 放貸方
          const diffDec = MoneyUtil.toDecimal(diffStr);
          const isLoss = isLiability ? diffDec.greaterThan(0) : diffDec.lessThan(0);

          adjustments.push({
            voucherId: voucher.id,
            diffStr: MoneyUtil.toDecimal(diffStr).abs().toString(),
            isLoss
          });
        }
      }
    }

    console.log(`[FxRevaluationWorker] Processed ${adjustments.length} revaluation entries.`);
    return adjustments;
  }
}

export const fxRevaluationWorkerService = new FxRevaluationWorkerService();
