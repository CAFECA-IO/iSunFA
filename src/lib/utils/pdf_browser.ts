import { logger } from "@/lib/utils/logger";

/**
 * Info: (20260810 - Emily) 伺服端列印共用的 Chrome 實例。
 *
 * 由 logistics_report_pdf.service 抽出(原註解為 20260731 - Tzuhan):
 * 實測單份請求 4.6s,其中絕大部分是冷啟動 —— 每個請求各啟一次 Chrome,
 * 27 份分 4 批就是 4 次啟動的純浪費。首次請求付啟動成本,之後重用。
 *
 * 抽成共用模組而不是各服務自己留一份:同一個 Node process 裡若有兩個
 * 模組層級的 browser 變數,就會有兩個 Chrome 常駐,記憶體翻倍 ——
 * 而它們解決的是同一個問題。碳盤查報告加入之後這件事才真的會發生。
 *
 * 沒有做閒置回收:Next 的 dev/serverless 都會在閒置後回收整個模組,
 * 自行加計時器反而會在請求密集時把正在用的實例關掉。
 * `connected` 檢查是為了處理 Chrome 自行崩潰後的重建。
 */

type PuppeteerModule = Awaited<typeof import("puppeteer")>;
export type IPrintBrowser = Awaited<
  ReturnType<PuppeteerModule["default"]["launch"]>
>;
export type IPrintPage = Awaited<ReturnType<IPrintBrowser["newPage"]>>;

let sharedBrowser: IPrintBrowser | null = null;

export const getPrintBrowser = async (): Promise<IPrintBrowser> => {
  if (sharedBrowser?.connected) return sharedBrowser;
  const puppeteer = (await import("puppeteer")).default;
  const started = Date.now();
  sharedBrowser = await puppeteer.launch({
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  logger.info("[PrintBrowser] launched", { ms: Date.now() - started });
  return sharedBrowser;
};

/**
 * Info: (20260810 - Emily) 崩潰後棄用共用實例 —— 壞掉的 Chrome 會讓後續請求全數失敗。
 *
 * **只在瀏覽器本身可能有問題時呼叫。** 已分類的失敗(例如缺中文字型)
 * 不該關掉它:那時瀏覽器是健康的,關掉只會讓後續每個請求多付一次冷啟動,
 * 對成因毫無幫助。
 */
export const dropPrintBrowser = async (): Promise<void> => {
  if (!sharedBrowser) return;
  await sharedBrowser.close().catch(() => undefined);
  sharedBrowser = null;
};
