import cron from "node-cron";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";
import Decimal from "decimal.js";

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 5000;
const TIMEOUT_MS = 15000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Info: (20260514 - Julian) 抓取台灣銀行匯率 CSV
 */
async function fetchExchangeRatesWithRetry(): Promise<string> {
  // Info: (20260514 - Julian) 最多重試 3 次
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch("https://rate.bot.com.tw/xrt/flcsv/0/day", {
        signal: controller.signal,
      });

      // Info: (20260514 - Julian) 設定 fetch timeout，避免因為當機或是網路問題卡住
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error(
        `[Cron] Attempt ${i + 1} failed to fetch exchange rates:`,
        error,
      );
      if (i === MAX_RETRIES - 1) throw error;
      await sleep(RETRY_DELAY_MS);
    }
  }
  throw new Error("Failed to fetch exchange rates after retries");
}

/**
 * Info: (20260514 - Julian) 將抓取到的 CSV 資料存入 DB
 */
export async function syncExchangeRates() {
  console.log("[Cron] Starting exchange rate sync...");
  try {
    const csvData = await fetchExchangeRatesWithRetry();
    const lines = csvData.split("\n");

    // Info: (20260514 - Julian) 目標幣別
    const targetCurrencies = ["USD", "EUR", "JPY", "CNY", "HKD", "KRW"];

    // Info: (20260514 - Julian) 統一日期為當天 UTC 午夜 00:00:00，避免因為時區問題導致重複執行產生多筆紀錄
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

    let updatedCount = 0;
    const newRateEntries: {
      date: string;
      baseCurrency: string;
      targetCurrency: string;
      rate: string;
      note: string;
    }[] = [];

    // Info: (20260514 - Julian) CSV 解析 (第一行是 Header，從第二行開始處理)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const cols = line.split(",");
      const currency = cols[0];

      if (!targetCurrencies.includes(currency)) continue;

      /* Info: (20260514 - Julian) 台灣銀行 CSV 結構：
       ** 0: 幣別 (USD, EUR, etc.)
       ** 1: 本行買入
       ** 2: 現金買入 (Cash Buy)
       ** 3: 即期買入 (Spot Buy)
       ** ...
       ** 11: 本行賣出
       ** 12: 現金賣出 (Cash Sell)
       ** 13: 即期賣出 (Spot Sell) */

      const spotBuy = new Decimal(cols[3] || 0);
      const spotSell = new Decimal(cols[13] || 0);

      let rateToSave = new Decimal(0);

      // Info: (20260514 - Julian) 優先使用「即期」匯率中價 (買進 + 賣出 / 2)
      if (spotBuy.gt(0) && spotSell.gt(0)) {
        rateToSave = spotBuy.add(spotSell).div(2);
      } else {
        // Info: (20260514 - Julian) 若無即期匯率，退而求其次使用「現金」匯率中價
        const cashBuy = new Decimal(cols[2] || 0);
        const cashSell = new Decimal(cols[12] || 0);
        if (cashBuy.gt(0) && cashSell.gt(0)) {
          rateToSave = cashBuy.add(cashSell).div(2);
        }
      }

      // Info: (20260514 - Julian) 若成功取得匯率，則將匯率存入 DB
      if (rateToSave.gt(0)) {
        await prisma.exchangeRate.upsert({
          where: {
            date_baseCurrency_targetCurrency: {
              date: today,
              baseCurrency: "TWD",
              targetCurrency: currency,
            },
          },
          update: {
            rate: rateToSave.toString(),
          },
          create: {
            date: today,
            baseCurrency: "TWD",
            targetCurrency: currency,
            rate: rateToSave.toString(),
          },
        });

        newRateEntries.push({
          date: dateStr,
          baseCurrency: "TWD",
          targetCurrency: currency,
          rate: rateToSave.toString(),
          note: "從台灣銀行每日爬蟲更新",
        });

        updatedCount++;
      }
    }
    console.log(
      `[Cron] Exchange rate sync completed. Updated ${updatedCount} currencies.`,
    );

    // Info: (20260515 - Julian) 將爬取的資料同步寫入 src/constants/exchange_rate 的 ts 檔案
    if (newRateEntries.length > 0) {
      try {
        const yearStr = dateStr.substring(0, 4);
        const constantsFilePath = path.join(
          process.cwd(),
          "src",
          "constants",
          "exchange_rate",
          `rate_${yearStr}.ts`,
        );

        if (fs.existsSync(constantsFilePath)) {
          let fileContent = fs.readFileSync(constantsFilePath, "utf-8");
          // Info: (20260515 - Julian) 移除最後的 closing bracket
          fileContent = fileContent.replace(/\];?\s*$/, "");

          let appendContent = "";
          let appendedCount = 0;

          for (const entry of newRateEntries) {
            // Info: (20260515 - Julian) 檢查是否已存在同一天、同幣別的資料，避免 Cron 重複執行造成 Duplicate Append
            const existsRegex = new RegExp(
              `date:\\s*["']${entry.date}["'],\\s*baseCurrency:\\s*["']${entry.baseCurrency}["'],\\s*targetCurrency:\\s*["']${entry.targetCurrency}["']`,
              "m",
            );
            if (!existsRegex.test(fileContent)) {
              appendContent += `  {
    date: "${entry.date}",
    baseCurrency: "${entry.baseCurrency}",
    targetCurrency: "${entry.targetCurrency}",
    rate: "${entry.rate}",
    note: "${entry.note}",
  },\n`;
              appendedCount++;
            } else {
              console.log(
                `[Cron] Entry for ${entry.targetCurrency} on ${entry.date} already exists in rate_${yearStr}.ts, skipping append.`,
              );
            }
          }

          if (appendedCount > 0) {
            fileContent += appendContent + "];\n";
            fs.writeFileSync(constantsFilePath, fileContent, "utf-8");
            console.log(
              `[Cron] Successfully appended ${appendedCount} new rates to rate_${yearStr}.ts`,
            );
          }
        } else {
          console.warn(
            `[Cron] File rate_${yearStr}.ts does not exist, skipping file append.`,
          );
        }
      } catch (err) {
        console.error("[Cron] Failed to write to constants file:", err);
      }
    }
  } catch (error) {
    console.error("[Cron] Error syncing exchange rates:", error);
  }
}

/**
 * Info: (20260514 - Julian) 啟動每天凌晨 02:00 的匯率爬蟲排程
 */
export const startExchangeRateCron = () => {
  cron.schedule("0 2 * * *", () => {
    syncExchangeRates();
  });
  console.log("[Cron] Scheduled exchange rate sync at 02:00 AM daily.");
};
